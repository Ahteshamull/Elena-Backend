const EmailValidateCheck = (email) => {
  // Supports: dots, plus signs, hyphens, underscores in local part
  // e.g. nahid.sparktech+200@gmail.com
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
};
export default EmailValidateCheck;
