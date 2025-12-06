/**
 * Service for generating patient login credentials
 */

const crypto = require("crypto");

/**
 * Generate a random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} Generated password
 */
const generatePassword = (length = 12) => {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed I, O to avoid confusion
  const lowercase = "abcdefghjkmnpqrstuvwxyz"; // Removed i, l, o to avoid confusion
  const numbers = "23456789"; // Removed 0, 1 to avoid confusion
  const special = "!@#$%&*";

  const allChars = uppercase + lowercase + numbers + special;

  // Ensure at least one of each type
  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

/**
 * Generate email from patient name
 * @param {string} firstName - Patient's first name
 * @param {string} lastName - Patient's last name
 * @param {string} domain - Email domain (default: patient.medicai.com)
 * @returns {string} Generated email
 */
const generateEmail = (firstName, lastName, domain = "patient.medicai.com") => {
  // Normalize names: lowercase, remove special characters
  const normalizedFirst = firstName
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .substring(0, 20);
  const normalizedLast = lastName
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .substring(0, 20);

  // Add random suffix to ensure uniqueness
  const randomSuffix = crypto.randomBytes(3).toString("hex");

  return `${normalizedFirst}.${normalizedLast}.${randomSuffix}@${domain}`;
};

/**
 * Generate username from patient name
 * @param {string} firstName - Patient's first name
 * @param {string} lastName - Patient's last name
 * @returns {string} Generated username
 */
const generateUsername = (firstName, lastName) => {
  const normalizedFirst = firstName
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .substring(0, 10);
  const normalizedLast = lastName
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .substring(0, 10);

  // Add random suffix to ensure uniqueness
  const randomSuffix = crypto.randomBytes(2).toString("hex");

  return `${normalizedFirst}.${normalizedLast}.${randomSuffix}`;
};

/**
 * Generate complete credentials for a patient
 * @param {Object} patient - Patient data with firstName and lastName
 * @returns {Object} Generated credentials { username, email, password }
 */
const generatePatientCredentials = (patient) => {
  const { firstName, lastName } = patient;

  if (!firstName || !lastName) {
    throw new Error(
      "First name and last name are required to generate credentials"
    );
  }

  return {
    username: generateUsername(firstName, lastName),
    email: generateEmail(firstName, lastName),
    password: generatePassword(12),
  };
};

module.exports = {
  generatePassword,
  generateEmail,
  generateUsername,
  generatePatientCredentials,
};


