// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ICommitmentVerifier} from "./ICommitmentVerifier.sol";

/// @notice Testnet adapter for a ZK-TLS proof aggregation service.
/// @dev This verifies an attestor signature, not a SNARK. Replace it with the audited
/// production verifier while keeping MoncastProtocol unchanged.
contract AttestedProofVerifier is ICommitmentVerifier {
    using MessageHashUtils for bytes32;

    address public immutable attestor;

    error ZeroAttestor();

    constructor(address attestor_) {
        if (attestor_ == address(0)) revert ZeroAttestor();
        attestor = attestor_;
    }

    function verify(
        uint256 pactId,
        address participant,
        uint32 epoch,
        bytes32 nullifier,
        bytes32 publicInputsHash,
        bytes calldata proof
    ) external view returns (bool) {
        bytes32 payload = keccak256(
            abi.encode(
                block.chainid,
                msg.sender,
                pactId,
                participant,
                epoch,
                nullifier,
                publicInputsHash
            )
        );
        return ECDSA.recover(payload.toEthSignedMessageHash(), proof) == attestor;
    }
}
