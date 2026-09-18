import { Input } from "@rallycaststv/ui/components/input";
import { Label } from "@rallycaststv/ui/components/label";
import { createFormHook, createFormHookContexts } from "@tanstack/react-form";

export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();

function FormInput({
  error,
  hint,
  label,
  placeholder,
  required,
  type = "text",
}: {
  error?: string;
  hint?: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  const field = useFieldContext<string>();
  const displayError = error || field.state.meta.errors[0]?.message;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name} className="text-sm font-medium">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 font-bold text-destructive">
            *
          </span>
        )}
      </Label>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <Input
        aria-invalid={Boolean(displayError)}
        aria-required={required}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        value={field.state.value}
      />
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
