/**
 * Password utility functions
 */

/**
 * Simple password hashing function
 * NOTE: This is not a secure implementation and should be replaced with a proper
 * password hashing library like bcrypt in a production environment
 * 
 * @param {string} password - The password to hash
 * @returns {Promise<string>} - A promise that resolves to the hashed password
 */
export const hashPassword = async (password) => {
  try {
    // This is NOT secure and is just for demonstration
    // In a real application, use a proper hashing algorithm like bcrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'some-salt-value');
    
    // Use the Web Crypto API to hash the password
    // This is available in modern browsers
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Error hashing password:', error);
    
    // Fallback to a very basic hash if Web Crypto API is not available
    // NEVER use this in production - it's extremely insecure
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
};

/**
 * Check if a password matches a hash
 * 
 * @param {string} password - The password to check
 * @param {string} hash - The hash to compare against
 * @returns {Promise<boolean>} - A promise that resolves to true if the password matches
 */
export const verifyPassword = async (password, hash) => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}; 