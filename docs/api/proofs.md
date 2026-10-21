# Proofs

Decode, export, unpack, and verify asset proofs.

- [decodeAssetProof](#decodeassetproof): Decode an asset proof or one proof in an asset proof file
- [exportAssetProof](#exportassetproof): Export the proof file of an asset
- [unpackAssetProofFile](#unpackassetprooffile): Get the individual proofs in an asset proof file
- [verifyAssetProof](#verifyassetproof): Verify an asset proof file

## decodeAssetProof

Decode an asset proof or one proof in an asset proof file

Requires `proofs:read` permission

For a proof file, `depth` selects the proof: 0 is the last proof

    {
      [depth]: <Proof Depth From the Last Proof In the File Number>
      [is_including_meta]: <Include the Asset Metadata Bool>
      proof: <Asset Proof or Proof File Hex String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      additional_inputs_count: <Additional Inputs Count Number>
      [alt_leaves]: <Alternative Leaves Hex String>
      asset: {
        amount: <Asset Units Numeric String>
        [anchor]: {
          [block_hash]: <Anchor Block Hash Hex String>
          [block_height]: <Anchor Block Height Number>
          [confirmed_at]: <Anchor Confirmed At ISO 8601 Date String>
          internal_key: <Anchor Internal Key Hex String>
          merkle_root: <Anchor Taproot Merkle Root Hex String>
          [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
          transaction: <Raw Anchor Transaction Hex String>
          transaction_id: <Anchor Transaction Id Hex String>
          transaction_vout: <Anchor Transaction Output Index Number>
        }
        asset_id: <Asset Id Hex String>
        [decimal_display]: <Decimal Places To Show Number>
        genesis_output_index: <Genesis Commitment Output Index Number>
        genesis_transaction_id: <Genesis Point Transaction Id Hex String>
        genesis_transaction_vout: <Genesis Point Transaction Output Index Number>
        [group]: {
          key: <Tweaked Group Key Hex String>
          raw_key: <Raw Group Key Hex String>
          [tapscript_root]: <Group Tapscript Root Hex String>
          [witness]: <Group Membership Witness Hex String>
        }
        is_burn: <Asset Is Burned Bool>
        is_collectible: <Asset Is Collectible Bool>
        is_local: <Script Key Belongs To This Node Bool>
        is_spent: <Asset Is Spent Bool>
        [lease_expires_at]: <Lease Expires At ISO 8601 Date String>
        [lease_owner]: <Lease Owner Id Hex String>
        [lock_time]: <Lock Time Number>
        meta_hash: <Asset Metadata Hash Hex String>
        name: <Asset Name String>
        [relative_lock_time]: <Relative Lock Time Number>
        script_key: <Script Key Hex String>
        script_key_type: <Script Key Type String>
        script_version: <Script Version Number>
        version: <Asset Version Number>
      }
      challenge_witness: [<Challenge Witness Element Hex String>]
      depth: <Proof Depth From the Last Proof In the File Number>
      exclusion_proofs: [<Exclusion Proof Hex String>]
      [genesis]: {
        asset_id: <Asset Id Hex String>
        is_collectible: <Asset Is Collectible Bool>
        meta_hash: <Asset Metadata Hash Hex String>
        name: <Asset Name String>
        output_index: <Genesis Commitment Output Index Number>
        transaction_id: <Genesis Point Transaction Id Hex String>
        transaction_vout: <Genesis Point Transaction Output Index Number>
      }
      [group_key]: {
        raw_key: <Raw Group Key Hex String>
        [tapscript_root]: <Group Tapscript Root Hex String>
      }
      inclusion_proof: <Inclusion Proof Hex String>
      is_burn: <Proof Is For a Burn Bool>
      [meta]: {
        data: <Metadata Hex String>
        hash: <Metadata Hash Hex String>
        type: <Metadata Type String> // json, opaque, unknown
      }
      proofs_count: <Proofs In the File Count Number>
      [split_root_proof]: <Split Root Proof Hex String>
      transaction_merkle_proof: <Transaction Merkle Proof Hex String>
    }

Example:

```js
import {decodeAssetProof} from 'tapass';

const {asset} = await decodeAssetProof({proof, tapd});
```

## exportAssetProof

Export the proof file of an asset

Requires `proofs:read` permission

If there is more than one proof for the asset id and the script key, an
anchor outpoint is necessary: `transaction_id` and `transaction_vout`

    {
      asset_id: <Asset Id Hex String>
      script_key: <Script Key Hex String>
      tapd: <Authenticated tapd API Object>
      [transaction_id]: <Anchor Transaction Id Hex String>
      [transaction_vout]: <Anchor Transaction Output Index Number>
    }

    @returns via cbk or Promise
    {
      proof: <Asset Proof File Hex String>
    }

Example:

```js
import {exportAssetProof} from 'tapass';

const {proof} = await exportAssetProof({asset_id, script_key, tapd});
```

## unpackAssetProofFile

Get the individual proofs in an asset proof file

Requires `proofs:read` permission

The first proof in the list is the first proof in the proof chain

    {
      proof: <Asset Proof File Hex String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      proofs: [<Asset Proof Hex String>]
    }

Example:

```js
import {unpackAssetProofFile} from 'tapass';

const {proofs} = await unpackAssetProofFile({proof, tapd});
```

## verifyAssetProof

Verify an asset proof file

Requires `proofs:read` permission

A valid proof file also returns its last proof, decoded

    {
      proof: <Asset Proof File Hex String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      is_valid: <Proof File Is Valid Bool>
      [proof]: {
        additional_inputs_count: <Additional Inputs Count Number>
        [alt_leaves]: <Alternative Leaves Hex String>
        asset: {
          amount: <Asset Units Numeric String>
          [anchor]: {
            [block_hash]: <Anchor Block Hash Hex String>
            [block_height]: <Anchor Block Height Number>
            [confirmed_at]: <Anchor Confirmed At ISO 8601 Date String>
            internal_key: <Anchor Internal Key Hex String>
            merkle_root: <Anchor Taproot Merkle Root Hex String>
            [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
            transaction: <Raw Anchor Transaction Hex String>
            transaction_id: <Anchor Transaction Id Hex String>
            transaction_vout: <Anchor Transaction Output Index Number>
          }
          asset_id: <Asset Id Hex String>
          [decimal_display]: <Decimal Places To Show Number>
          genesis_output_index: <Genesis Commitment Output Index Number>
          genesis_transaction_id: <Genesis Point Transaction Id Hex String>
          genesis_transaction_vout: <Genesis Point Output Index Number>
          [group]: {
            key: <Tweaked Group Key Hex String>
            raw_key: <Raw Group Key Hex String>
            [tapscript_root]: <Group Tapscript Root Hex String>
            [witness]: <Group Membership Witness Hex String>
          }
          is_burn: <Asset Is Burned Bool>
          is_collectible: <Asset Is Collectible Bool>
          is_local: <Script Key Belongs To This Node Bool>
          is_spent: <Asset Is Spent Bool>
          [lease_expires_at]: <Lease Expires At ISO 8601 Date String>
          [lease_owner]: <Lease Owner Id Hex String>
          [lock_time]: <Lock Time Number>
          meta_hash: <Asset Metadata Hash Hex String>
          name: <Asset Name String>
          [relative_lock_time]: <Relative Lock Time Number>
          script_key: <Script Key Hex String>
          script_key_type: <Script Key Type String>
          script_version: <Script Version Number>
          version: <Asset Version Number>
        }
        challenge_witness: [<Challenge Witness Element Hex String>]
        depth: <Proof Depth From the Last Proof In the File Number>
        exclusion_proofs: [<Exclusion Proof Hex String>]
        [genesis]: {
          asset_id: <Asset Id Hex String>
          is_collectible: <Asset Is Collectible Bool>
          meta_hash: <Asset Metadata Hash Hex String>
          name: <Asset Name String>
          output_index: <Genesis Commitment Output Index Number>
          transaction_id: <Genesis Point Transaction Id Hex String>
          transaction_vout: <Genesis Point Transaction Output Index Number>
        }
        [group_key]: {
          raw_key: <Raw Group Key Hex String>
          [tapscript_root]: <Group Tapscript Root Hex String>
        }
        inclusion_proof: <Inclusion Proof Hex String>
        is_burn: <Proof Is For a Burn Bool>
        proofs_count: <Proofs In the File Count Number>
        [split_root_proof]: <Split Root Proof Hex String>
        transaction_merkle_proof: <Transaction Merkle Proof Hex String>
      }
    }

Example:

```js
import {verifyAssetProof} from 'tapass';

const {is_valid} = await verifyAssetProof({proof, tapd});
```
