// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Adapter boundary for a ZK-TLS proof verifier or proof-aggregation attestor.
interface ICommitmentVerifier {
    function verify(
        uint256 pactId,
        address participant,
        uint32 epoch,
        bytes32 nullifier,
        bytes32 publicInputsHash,
        bytes calldata proof
    ) external view returns (bool);
}
