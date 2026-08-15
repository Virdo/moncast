// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ICommitmentVerifier} from "./ICommitmentVerifier.sol";

/// @title MoncastProtocol
/// @notice Recruit-first, USDC-backed commitments with verifiable delegated completion.
/// @dev Handles, API URLs and provider responses remain offchain. A proof may be relayed
/// by the member or an automation keeper, but it is always bound to the member and epoch.
contract MoncastProtocol is ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    uint16 public constant PROTOCOL_VERSION = 2;
    uint40 public constant MIN_RECRUITMENT = 1 hours;
    uint40 public constant MAX_RECRUITMENT = 7 days;
    uint40 public constant COMPLETION_GRACE = 48 hours;
    uint16 public constant MAX_MEMBERS_CAP = 128;
    uint16 public constant MAX_ACTIVATION_BATCH = 24;
    uint256 public constant USDC_UNIT = 1e6;

    bytes32 public constant INVITE_TYPEHASH = keccak256(
        "Invite(uint256 pactId,address participant,uint256 nonce,uint256 deadline)"
    );

    enum PactStatus {
        None,
        Recruiting,
        Activating,
        Active,
        Cancelled,
        Finalized
    }

    enum MemberState {
        None,
        Enrolled,
        Active,
        Declined,
        Succeeded,
        Slashed,
        Claimed,
        Refunded
    }

    struct PactConfig {
        bytes32 metadataHash;
        bytes32 ruleHash;
        address inviteAuthority;
        uint8 durationDays;
        uint40 recruitmentDuration;
        uint128 stakeAmount;
        uint16 maxMembers;
        int16 utcOffsetMinutes;
        bool isPrivate;
    }

    struct Pact {
        address creator;
        address inviteAuthority;
        bytes32 metadataHash;
        bytes32 ruleHash;
        uint40 recruitmentEndsAt;
        uint32 startLocalDay;
        uint32 endLocalDay;
        uint128 stakeAmount;
        uint128 slashPool;
        uint128 yieldPool;
        uint128 claimedBonus;
        uint16 maxMembers;
        uint16 memberCount;
        uint16 activationCursor;
        uint16 fundedCount;
        uint16 processedCount;
        uint16 successfulCount;
        uint16 claimedSuccesses;
        uint8 durationDays;
        int16 utcOffsetMinutes;
        bool isPrivate;
        PactStatus status;
    }

    struct Member {
        uint40 enrolledAt;
        uint40 lastCompletedAt;
        uint16 completions;
        MemberState state;
    }

    IERC20 public immutable collateralToken;
    ICommitmentVerifier public immutable verifier;
    address public immutable treasury;
    uint256 public pactCount;

    mapping(uint256 pactId => Pact pact) public pacts;
    mapping(uint256 pactId => mapping(address participant => Member member)) public members;
    mapping(uint256 pactId => address[] participants) private _memberList;
    mapping(uint256 pactId => mapping(address participant => mapping(uint32 epoch => bool completed)))
        public completedEpoch;
    mapping(bytes32 nullifier => bool used) public usedNullifiers;
    mapping(uint256 pactId => mapping(uint256 nonce => bool used)) public usedInviteNonces;

    error InvalidAddress();
    error InvalidDuration();
    error InvalidRecruitmentDuration();
    error InvalidStake();
    error InvalidMemberLimit();
    error InvalidTimezone();
    error PactNotFound();
    error RecruitmentClosed();
    error RecruitmentStillOpen();
    error NotPactCreator();
    error NotEnoughMembers();
    error PactFull();
    error AlreadyMember();
    error InvalidInvite();
    error InviteExpired();
    error InviteAlreadyUsed();
    error InvalidBatchSize();
    error ActivationIncomplete();
    error NotActiveMember();
    error CompletionClosed();
    error InvalidEpoch();
    error AlreadyCompleted();
    error NullifierAlreadyUsed();
    error InvalidProof();
    error GracePeriodActive();
    error SettlementNotOpen();
    error MemberAlreadyProcessed();
    error SettlementIncomplete();
    error AlreadyFinalized();
    error NotFinalized();
    error NothingToClaim();
    error NothingToRefund();
    error AmountOverflow();

    event PactCreated(
        uint256 indexed pactId,
        address indexed creator,
        bytes32 indexed metadataHash,
        bytes32 ruleHash,
        uint40 recruitmentEndsAt,
        uint128 stakeAmount,
        uint16 maxMembers,
        bool isPrivate
    );
    event MemberEnrolled(uint256 indexed pactId, address indexed participant);
    event MemberFunded(uint256 indexed pactId, address indexed participant, uint128 stakeAmount);
    event MemberDeclined(uint256 indexed pactId, address indexed participant);
    event RecruitmentClosedEarly(uint256 indexed pactId, address indexed creator, uint40 scheduledEndsAt);
    event PactActivated(uint256 indexed pactId, uint32 startLocalDay, uint32 endLocalDay, uint16 fundedCount);
    event PactCancelled(uint256 indexed pactId, uint16 fundedCount);
    event Completed(
        uint256 indexed pactId,
        address indexed participant,
        uint32 indexed epoch,
        address relayer,
        bytes32 nullifier,
        bytes32 publicInputsHash
    );
    event MemberSettled(uint256 indexed pactId, address indexed participant, bool succeeded);
    event MemberLiquidated(uint256 indexed pactId, address indexed participant, uint128 slashedAmount);
    event YieldDeposited(uint256 indexed pactId, address indexed sponsor, uint128 amount);
    event PactFinalized(uint256 indexed pactId, uint16 successfulCount, uint128 slashPool, uint128 yieldPool);
    event RewardClaimed(uint256 indexed pactId, address indexed participant, uint256 principal, uint256 bonus);
    event CancelledStakeRefunded(uint256 indexed pactId, address indexed participant, uint256 amount);

    constructor(IERC20 collateralToken_, ICommitmentVerifier verifier_, address treasury_)
        EIP712("Moncast", "1")
    {
        if (address(collateralToken_) == address(0) || address(verifier_) == address(0) || treasury_ == address(0)) {
            revert InvalidAddress();
        }
        collateralToken = collateralToken_;
        verifier = verifier_;
        treasury = treasury_;
    }

    /// @notice Opens recruitment. No collateral moves until recruitment is over.
    /// The creator must approve this contract before activation, like every other member.
    function createPact(PactConfig calldata config) external returns (uint256 pactId) {
        if (config.durationDays != 7 && config.durationDays != 14 && config.durationDays != 30) {
            revert InvalidDuration();
        }
        if (config.recruitmentDuration < MIN_RECRUITMENT || config.recruitmentDuration > MAX_RECRUITMENT) {
            revert InvalidRecruitmentDuration();
        }
        if (!_isAllowedStake(config.stakeAmount)) revert InvalidStake();
        if (config.maxMembers < 2 || config.maxMembers > MAX_MEMBERS_CAP) revert InvalidMemberLimit();
        if (config.utcOffsetMinutes < -720 || config.utcOffsetMinutes > 840) revert InvalidTimezone();

        pactId = ++pactCount;
        uint40 recruitmentEndsAt = uint40(block.timestamp) + config.recruitmentDuration;
        pacts[pactId] = Pact({
            creator: msg.sender,
            inviteAuthority: config.inviteAuthority == address(0) ? msg.sender : config.inviteAuthority,
            metadataHash: config.metadataHash,
            ruleHash: config.ruleHash,
            recruitmentEndsAt: recruitmentEndsAt,
            startLocalDay: 0,
            endLocalDay: 0,
            stakeAmount: config.stakeAmount,
            slashPool: 0,
            yieldPool: 0,
            claimedBonus: 0,
            maxMembers: config.maxMembers,
            memberCount: 1,
            activationCursor: 0,
            fundedCount: 0,
            processedCount: 0,
            successfulCount: 0,
            claimedSuccesses: 0,
            durationDays: config.durationDays,
            utcOffsetMinutes: config.utcOffsetMinutes,
            isPrivate: config.isPrivate,
            status: PactStatus.Recruiting
        });
        _enroll(pactId, msg.sender);

        emit PactCreated(
            pactId,
            msg.sender,
            config.metadataHash,
            config.ruleHash,
            recruitmentEndsAt,
            config.stakeAmount,
            config.maxMembers,
            config.isPrivate
        );
    }

    /// @notice Enrolls and records intent. The approved stake is pulled only after recruitment.
    function joinPact(
        uint256 pactId,
        uint256 inviteNonce,
        uint256 inviteDeadline,
        bytes calldata inviteSignature
    ) external {
        Pact storage pact = _pact(pactId);
        if (pact.status != PactStatus.Recruiting || block.timestamp >= pact.recruitmentEndsAt) {
            revert RecruitmentClosed();
        }
        if (pact.memberCount >= pact.maxMembers) revert PactFull();
        if (members[pactId][msg.sender].state != MemberState.None) revert AlreadyMember();

        if (pact.isPrivate) {
            if (block.timestamp > inviteDeadline) revert InviteExpired();
            if (usedInviteNonces[pactId][inviteNonce]) revert InviteAlreadyUsed();
            bytes32 structHash = keccak256(
                abi.encode(INVITE_TYPEHASH, pactId, msg.sender, inviteNonce, inviteDeadline)
            );
            if (ECDSA.recover(_hashTypedDataV4(structHash), inviteSignature) != pact.inviteAuthority) {
                revert InvalidInvite();
            }
            usedInviteNonces[pactId][inviteNonce] = true;
        }

        pact.memberCount += 1;
        _enroll(pactId, msg.sender);
    }

    /// @notice Pulls approved collateral after recruitment in bounded batches.
    /// Members without sufficient balance/allowance are excluded without blocking the team.
    function activateMembers(uint256 pactId, uint16 limit) external nonReentrant {
        Pact storage pact = _pact(pactId);
        if (block.timestamp < pact.recruitmentEndsAt) revert RecruitmentStillOpen();
        if (pact.status == PactStatus.Recruiting) pact.status = PactStatus.Activating;
        if (pact.status != PactStatus.Activating) revert ActivationIncomplete();
        if (limit == 0 || limit > MAX_ACTIVATION_BATCH) revert InvalidBatchSize();

        _activateMembers(pactId, pact, limit);
    }

    /// @notice Lets the creator close recruitment and sign with every currently enrolled member.
    /// @dev This intentionally processes at most MAX_MEMBERS_CAP members in one tightly estimated
    /// transaction so the product can offer a true one-click early start.
    function startPactNow(uint256 pactId) external nonReentrant {
        Pact storage pact = _pact(pactId);
        if (msg.sender != pact.creator) revert NotPactCreator();
        if (pact.status != PactStatus.Recruiting || block.timestamp >= pact.recruitmentEndsAt) {
            revert RecruitmentClosed();
        }
        if (pact.memberCount < 2) revert NotEnoughMembers();

        uint40 scheduledEndsAt = pact.recruitmentEndsAt;
        pact.recruitmentEndsAt = uint40(block.timestamp);
        pact.status = PactStatus.Activating;
        emit RecruitmentClosedEarly(pactId, msg.sender, scheduledEndsAt);
        _activateMembers(pactId, pact, pact.memberCount);
    }

    function _activateMembers(uint256 pactId, Pact storage pact, uint16 limit) private {
        uint16 end = pact.activationCursor + limit;
        if (end > pact.memberCount) end = pact.memberCount;
        for (uint16 index = pact.activationCursor; index < end; index++) {
            address participant = _memberList[pactId][index];
            Member storage member = members[pactId][participant];
            bool funded = _tryTransferFrom(participant, pact.stakeAmount);
            if (funded) {
                member.state = MemberState.Active;
                member.lastCompletedAt = uint40(block.timestamp);
                pact.fundedCount += 1;
                emit MemberFunded(pactId, participant, pact.stakeAmount);
            } else {
                member.state = MemberState.Declined;
                emit MemberDeclined(pactId, participant);
            }
        }
        pact.activationCursor = end;
        if (end == pact.memberCount) _finishActivation(pactId, pact);
    }

    /// @notice Records completion for a participant. Keepers can relay an attested proof.
    function completeFor(
        uint256 pactId,
        address participant,
        uint32 epoch,
        bytes32 nullifier,
        bytes32 publicInputsHash,
        bytes calldata proof
    ) public {
        Pact storage pact = _pact(pactId);
        if (pact.status != PactStatus.Active) revert CompletionClosed();
        Member storage member = members[pactId][participant];
        if (member.state != MemberState.Active) revert NotActiveMember();

        uint32 localDay = _localDay(pact.utcOffsetMinutes);
        if (localDay < pact.startLocalDay || localDay >= pact.endLocalDay) revert CompletionClosed();
        uint32 expectedEpoch = localDay - pact.startLocalDay;
        if (epoch != expectedEpoch) revert InvalidEpoch();
        if (completedEpoch[pactId][participant][epoch]) revert AlreadyCompleted();
        if (usedNullifiers[nullifier]) revert NullifierAlreadyUsed();
        if (!verifier.verify(pactId, participant, epoch, nullifier, publicInputsHash, proof)) {
            revert InvalidProof();
        }

        completedEpoch[pactId][participant][epoch] = true;
        usedNullifiers[nullifier] = true;
        member.lastCompletedAt = uint40(block.timestamp);
        member.completions += 1;

        emit Completed(pactId, participant, epoch, msg.sender, nullifier, publicInputsHash);
    }

    function complete(
        uint256 pactId,
        uint32 epoch,
        bytes32 nullifier,
        bytes32 publicInputsHash,
        bytes calldata proof
    ) external {
        completeFor(pactId, msg.sender, epoch, nullifier, publicInputsHash, proof);
    }

    function liquidate(uint256 pactId, address participant) external {
        Pact storage pact = _pact(pactId);
        Member storage member = members[pactId][participant];
        if (pact.status != PactStatus.Active || member.state != MemberState.Active) revert NotActiveMember();
        if (block.timestamp <= uint256(member.lastCompletedAt) + COMPLETION_GRACE) revert GracePeriodActive();
        _slash(pactId, pact, member, participant);
    }

    function settleMember(uint256 pactId, address participant) external {
        Pact storage pact = _pact(pactId);
        if (pact.status != PactStatus.Active || _localDay(pact.utcOffsetMinutes) < pact.endLocalDay) {
            revert SettlementNotOpen();
        }
        Member storage member = members[pactId][participant];
        if (member.state != MemberState.Active) revert MemberAlreadyProcessed();

        if (member.completions == pact.durationDays) {
            member.state = MemberState.Succeeded;
            pact.successfulCount += 1;
            pact.processedCount += 1;
            emit MemberSettled(pactId, participant, true);
        } else {
            _slash(pactId, pact, member, participant);
        }
    }

    function finalizePact(uint256 pactId) external nonReentrant {
        Pact storage pact = _pact(pactId);
        if (pact.status == PactStatus.Finalized) revert AlreadyFinalized();
        if (pact.status != PactStatus.Active || _localDay(pact.utcOffsetMinutes) < pact.endLocalDay) {
            revert SettlementNotOpen();
        }
        if (pact.processedCount != pact.fundedCount) revert SettlementIncomplete();

        pact.status = PactStatus.Finalized;
        if (pact.successfulCount == 0) {
            uint256 orphanedPool = uint256(pact.slashPool) + pact.yieldPool;
            if (orphanedPool > 0) collateralToken.safeTransfer(treasury, orphanedPool);
        }
        emit PactFinalized(pactId, pact.successfulCount, pact.slashPool, pact.yieldPool);
    }

    function depositYield(uint256 pactId, uint128 amount) external nonReentrant {
        Pact storage pact = _pact(pactId);
        if (pact.status != PactStatus.Active) revert CompletionClosed();
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 nextYieldPool = uint256(pact.yieldPool) + amount;
        if (nextYieldPool > type(uint128).max) revert AmountOverflow();
        pact.yieldPool = uint128(nextYieldPool);
        emit YieldDeposited(pactId, msg.sender, amount);
    }

    function claim(uint256 pactId) external nonReentrant returns (uint256 payout) {
        Pact storage pact = _pact(pactId);
        if (pact.status != PactStatus.Finalized) revert NotFinalized();
        Member storage member = members[pactId][msg.sender];
        if (member.state != MemberState.Succeeded) revert NothingToClaim();

        uint256 bonusPool = uint256(pact.slashPool) + pact.yieldPool;
        uint256 remainingBonus = bonusPool - pact.claimedBonus;
        uint256 bonus = pact.claimedSuccesses + 1 == pact.successfulCount
            ? remainingBonus
            : bonusPool / pact.successfulCount;

        member.state = MemberState.Claimed;
        pact.claimedSuccesses += 1;
        pact.claimedBonus += uint128(bonus);
        payout = uint256(pact.stakeAmount) + bonus;
        collateralToken.safeTransfer(msg.sender, payout);
        emit RewardClaimed(pactId, msg.sender, pact.stakeAmount, bonus);
    }

    function refundCancelled(uint256 pactId) external nonReentrant {
        Pact storage pact = _pact(pactId);
        Member storage member = members[pactId][msg.sender];
        if (pact.status != PactStatus.Cancelled || member.state != MemberState.Active) revert NothingToRefund();
        member.state = MemberState.Refunded;
        collateralToken.safeTransfer(msg.sender, pact.stakeAmount);
        emit CancelledStakeRefunded(pactId, msg.sender, pact.stakeAmount);
    }

    function inviteDigest(
        uint256 pactId,
        address participant,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(INVITE_TYPEHASH, pactId, participant, nonce, deadline)));
    }

    function memberList(uint256 pactId) external view returns (address[] memory) {
        _pact(pactId);
        return _memberList[pactId];
    }

    function currentEpoch(uint256 pactId) external view returns (uint32 epoch, bool completionOpen) {
        Pact storage pact = _pact(pactId);
        uint32 localDay = _localDay(pact.utcOffsetMinutes);
        completionOpen = pact.status == PactStatus.Active && localDay >= pact.startLocalDay && localDay < pact.endLocalDay;
        epoch = completionOpen ? localDay - pact.startLocalDay : 0;
    }

    function _enroll(uint256 pactId, address participant) private {
        _memberList[pactId].push(participant);
        members[pactId][participant] = Member({
            enrolledAt: uint40(block.timestamp),
            lastCompletedAt: 0,
            completions: 0,
            state: MemberState.Enrolled
        });
        emit MemberEnrolled(pactId, participant);
    }

    function _finishActivation(uint256 pactId, Pact storage pact) private {
        if (pact.fundedCount < 2) {
            pact.status = PactStatus.Cancelled;
            emit PactCancelled(pactId, pact.fundedCount);
            return;
        }
        uint32 today = _localDay(pact.utcOffsetMinutes);
        pact.startLocalDay = _localSecond(pact.utcOffsetMinutes) >= 23 hours ? today + 1 : today;
        pact.endLocalDay = pact.startLocalDay + pact.durationDays;
        pact.status = PactStatus.Active;
        emit PactActivated(pactId, pact.startLocalDay, pact.endLocalDay, pact.fundedCount);
    }

    function _tryTransferFrom(address from, uint128 amount) private returns (bool) {
        (bool success, bytes memory returndata) = address(collateralToken).call(
            abi.encodeCall(IERC20.transferFrom, (from, address(this), uint256(amount)))
        );
        if (!success) return false;
        if (returndata.length == 0) return true;
        if (returndata.length != 32) return false;
        return abi.decode(returndata, (bool));
    }

    function _slash(uint256 pactId, Pact storage pact, Member storage member, address participant) private {
        member.state = MemberState.Slashed;
        pact.processedCount += 1;
        uint256 nextSlashPool = uint256(pact.slashPool) + pact.stakeAmount;
        if (nextSlashPool > type(uint128).max) revert AmountOverflow();
        pact.slashPool = uint128(nextSlashPool);
        emit MemberLiquidated(pactId, participant, pact.stakeAmount);
        emit MemberSettled(pactId, participant, false);
    }

    function _pact(uint256 pactId) private view returns (Pact storage pact) {
        pact = pacts[pactId];
        if (pact.status == PactStatus.None) revert PactNotFound();
    }

    function _localDay(int16 utcOffsetMinutes) private view returns (uint32) {
        int256 adjusted = int256(block.timestamp) + int256(utcOffsetMinutes) * 60;
        if (adjusted < 0) revert InvalidTimezone();
        return uint32(uint256(adjusted) / 1 days);
    }

    function _localSecond(int16 utcOffsetMinutes) private view returns (uint32) {
        int256 adjusted = int256(block.timestamp) + int256(utcOffsetMinutes) * 60;
        if (adjusted < 0) revert InvalidTimezone();
        return uint32(uint256(adjusted) % 1 days);
    }

    function _isAllowedStake(uint128 amount) private pure returns (bool) {
        return amount == 30 * USDC_UNIT || amount == 50 * USDC_UNIT || amount == 100 * USDC_UNIT
            || amount == 200 * USDC_UNIT;
    }
}
