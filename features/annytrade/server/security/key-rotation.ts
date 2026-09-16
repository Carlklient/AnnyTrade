/**
 * Key rotation status — thin wrapper over secret-box.
 * @see docs/annytrade/09-security-compliance.md
 */

export {
  encryptionRotationStatus as encryptionKeyStatus,
  rewrapSecret,
} from "./secret-box";
