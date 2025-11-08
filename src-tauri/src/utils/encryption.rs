use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use anyhow::{Context, Result};
use base64::{Engine as _, engine::general_purpose};
use rand::RngCore;
use std::sync::Arc;
use log::debug;

/// 加密服务
pub struct EncryptionService {
    cipher: Aes256Gcm,
}

impl EncryptionService {
    /// 创建新的加密服务
    pub fn new() -> Result<Self> {
        // 生成或加载密钥
        let key = Self::generate_or_load_key()?;
        let cipher = Aes256Gcm::new(&key);
        
        debug!("加密服务初始化成功");
        Ok(Self { cipher })
    }

    /// 加密密码
    pub fn encrypt_password(&self, password: &str) -> Result<String> {
        debug!("加密密码");

        // 生成随机 nonce
        let mut nonce_bytes = [0u8; 12];
        rand::rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        // 加密
        let ciphertext = self.cipher
            .encrypt(nonce, password.as_bytes())
            .map_err(|e| anyhow::anyhow!("加密失败: {}", e))?;
        
        // 组合 nonce 和密文
        let mut result = nonce_bytes.to_vec();
        result.extend_from_slice(&ciphertext);
        
        // Base64 编码
        let encoded = general_purpose::STANDARD.encode(&result);
        
        debug!("密码加密成功");
        Ok(encoded)
    }

    /// 解密密码
    pub fn decrypt_password(&self, encrypted_password: &str) -> Result<String> {
        debug!("解密密码");
        
        // Base64 解码
        let encrypted_data = general_purpose::STANDARD
            .decode(encrypted_password)
            .context("Base64 解码失败")?;
        
        if encrypted_data.len() < 12 {
            return Err(anyhow::anyhow!("加密数据格式错误"));
        }
        
        // 分离 nonce 和密文
        let (nonce_bytes, ciphertext) = encrypted_data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        
        // 解密
        let plaintext = self.cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| anyhow::anyhow!("解密失败: {}", e))?;
        
        let password = String::from_utf8(plaintext)
            .context("密码格式错误")?;
        
        debug!("密码解密成功");
        Ok(password)
    }

    /// 生成或加载密钥
    fn generate_or_load_key() -> Result<aes_gcm::Key<Aes256Gcm>> {
        // 在实际应用中，应该从安全的地方加载密钥
        // 这里为了简化，使用固定的密钥生成方式

        let key_material = b"influxdb_gui_manager_key_32bytes";
        if key_material.len() != 32 {
            return Err(anyhow::anyhow!("密钥长度必须为 32 字节"));
        }

        Ok(*aes_gcm::Key::<Aes256Gcm>::from_slice(key_material))
    }

    /// 验证加密服务
    pub fn verify(&self) -> Result<()> {
        debug!("验证加密服务");
        
        let test_password = "test_password_123";
        let encrypted = self.encrypt_password(test_password)?;
        let decrypted = self.decrypt_password(&encrypted)?;
        
        if test_password != decrypted {
            return Err(anyhow::anyhow!("加密服务验证失败"));
        }
        
        debug!("加密服务验证成功");
        Ok(())
    }
}

impl Default for EncryptionService {
    fn default() -> Self {
        Self::new().expect("创建默认加密服务失败")
    }
}

/// 创建共享的加密服务实例
pub fn create_encryption_service() -> Result<Arc<EncryptionService>> {
    let service = EncryptionService::new()?;
    service.verify()?;
    Ok(Arc::new(service))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_decryption() {
        let service = EncryptionService::new().unwrap();
        
        let original = "test_password_123";
        let encrypted = service.encrypt_password(original).unwrap();
        let decrypted = service.decrypt_password(&encrypted).unwrap();
        
        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_different_encryptions() {
        let service = EncryptionService::new().unwrap();
        
        let password = "same_password";
        let encrypted1 = service.encrypt_password(password).unwrap();
        let encrypted2 = service.encrypt_password(password).unwrap();
        
        // 由于使用随机 nonce，两次加密结果应该不同
        assert_ne!(encrypted1, encrypted2);
        
        // 但解密结果应该相同
        let decrypted1 = service.decrypt_password(&encrypted1).unwrap();
        let decrypted2 = service.decrypt_password(&encrypted2).unwrap();
        
        assert_eq!(decrypted1, decrypted2);
        assert_eq!(decrypted1, password);
    }

    #[test]
    fn test_invalid_encrypted_data() {
        let service = EncryptionService::new().unwrap();
        
        // 测试无效的 Base64
        assert!(service.decrypt_password("invalid_base64!").is_err());
        
        // 测试太短的数据
        let short_data = general_purpose::STANDARD.encode(b"short");
        assert!(service.decrypt_password(&short_data).is_err());
        
        // 测试错误的密文
        let wrong_data = general_purpose::STANDARD.encode(b"wrong_ciphertext_data_12345678901234567890");
        assert!(service.decrypt_password(&wrong_data).is_err());
    }
}
