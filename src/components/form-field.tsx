"use client";

import type { ComponentProps, ReactNode } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type BaseProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: ReactNode;
  description?: ReactNode;
  /** Rendered next to the label (e.g. "Forgot password?" link). */
  labelAction?: ReactNode;
};

type TextFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<ComponentProps<typeof Input>, "name" | "value" | "onChange" | "onBlur" | "defaultValue">;

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  labelAction,
  ...inputProps
}: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            {labelAction}
          </div>
          <Input
            {...inputProps}
            {...field}
            value={field.value ?? ""}
            id={field.name}
            aria-invalid={fieldState.invalid}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.error && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

type TextareaFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<ComponentProps<typeof Textarea>, "name" | "value" | "onChange" | "onBlur" | "defaultValue">;

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  ...props
}: TextareaFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Textarea {...props} {...field} value={field.value ?? ""} id={field.name} aria-invalid={fieldState.invalid} />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.error && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
