# The same form in plain React

This is the ContactForm from the [README](../README.md) implemented without enforma, using standard React state and hooks.

```tsx
import { useState, useCallback } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateName = useCallback((value: string) => {
    if (!value) return "Name is required";
    return null;
  }, []);

  const validateEmail = useCallback((value: string) => {
    if (!value) return "Email is required";
    if (!value.includes("@")) return "Invalid email";
    return null;
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (nameTouched) setNameError(validateName(value));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailTouched) setEmailError(validateEmail(value));
  };

  const handleNameBlur = () => {
    setNameTouched(true);
    setNameError(validateName(name));
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nErr = validateName(name);
    const eErr = validateEmail(email);
    setNameError(nErr);
    setEmailError(eErr);
    setNameTouched(true);
    setEmailTouched(true);
    if (nErr || eErr) return;
    setIsSubmitting(true);
    try {
      await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailPlaceholder = name ? `Email for ${name}` : "Enter your name first";
  const emailDisabled = !name;

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          value={name}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
        />
        {nameTouched && nameError && <span>{nameError}</span>}
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          value={email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          placeholder={emailPlaceholder}
          disabled={emailDisabled}
        />
        {emailTouched && emailError && <span>{emailError}</span>}
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
```
