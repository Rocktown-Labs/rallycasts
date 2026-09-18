import { Input } from "@rallycaststv/ui/components/input";
import { Label } from "@rallycaststv/ui/components/label";
import { createFormHook, createFormHookContexts } from "@tanstack/react-form";

export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();

function FormInput({
  className,
  error,
  hint,
  icon: Icon,
  label,
  list,
  maxLength,
  placeholder,
  required,
  type = "text",
  uppercase = false,
}: {
  className?: string;
  error?: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  list?: string;
  maxLength?: number;
  placeholder?: string;
  required?: boolean;
  type?: string;
  uppercase?: boolean;
}) {
  const field = useFieldContext<string>();
  const displayError = error || field.state.meta.errors[0]?.message;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (uppercase) {
      val = val.toUpperCase();
    }
    if (maxLength && val.length > maxLength) {
      val = val.slice(0, maxLength);
    }
    field.handleChange(val);
  };

  let inputClassName = className || "";
  if (Icon) {
    inputClassName = `${inputClassName} pl-9`;
  }
  if (uppercase) {
    inputClassName = `${inputClassName} uppercase tracking-wider font-mono font-semibold`;
  }

  return (
    <div className="space-y-1.5">
      <Label
        className="text-sm font-medium flex items-center justify-between"
        htmlFor={field.name}
      >
        <span>
          {label}
          {required && (
            <span
              aria-hidden="true"
              className="ml-1 font-bold text-destructive"
            >
              *
            </span>
          )}
        </span>
        {maxLength ? (
          <span className="text-[10px] text-muted-foreground font-mono">
            {field.state.value?.length ?? 0}/{maxLength}
          </span>
        ) : null}
      </Label>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
        )}
        <Input
          aria-invalid={Boolean(displayError)}
          aria-required={required}
          className={inputClassName.trim()}
          id={field.name}
          list={list}
          maxLength={maxLength}
          name={field.name}
          onBlur={field.handleBlur}
          onChange={handleChange}
          placeholder={placeholder}
          type={type}
          value={field.state.value}
        />
      </div>
      {displayError && (
        <p className="text-xs text-destructive">{displayError}</p>
      )}
    </div>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <button
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          {children}
        </button>
      )}
    </form.Subscribe>
  );
}

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    FormInput,
  },
  fieldContext,
  formComponents: {
    SubmitButton,
  },
  formContext,
});
