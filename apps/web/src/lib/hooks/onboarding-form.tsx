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
        className="flex items-center justify-between text-sm font-medium"
        htmlFor={field.name}
      >
        <span>
          {label}
          {required && (
            <span
              aria-hidden="true"
              className="text-destructive ml-1 font-bold"
            >
              *
            </span>
          )}
        </span>
        {maxLength ? (
          <span className="text-muted-foreground font-mono text-[10px]">
            {field.state.value?.length ?? 0}/{maxLength}
          </span>
        ) : null}
      </Label>
      {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
      <div className="relative">
        {Icon && (
          <Icon className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4" />
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
        <p className="text-destructive text-xs">{displayError}</p>
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
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors disabled:opacity-50"
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
