import { useId, useState } from 'react';

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export function Input({ label, hint, error, type = 'text', ...rest }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <input id={id} type={type} className="input" {...rest} />
    </Field>
  );
}

export function PasswordInput({ label, hint, error, ...rest }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div className="input-with-suffix">
        <input id={id} type={show ? 'text' : 'password'} className="input" {...rest} />
        <button
          type="button"
          className="input-suffix"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'hide password' : 'show password'}
        >
          {show ? 'hide' : 'show'}
        </button>
      </div>
    </Field>
  );
}

export function Textarea({ label, hint, error, inputRef, ...rest }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <textarea ref={inputRef} id={id} className="textarea" {...rest} />
    </Field>
  );
}
