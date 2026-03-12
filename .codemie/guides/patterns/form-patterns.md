# Form Patterns

> **Form handling with React Hook Form and Yup validation**

## Table of Contents
1. [Overview](#overview)
2. [Basic Form](#basic-form)
3. [Form with Validation](#form-with-validation)
4. [Complex Form](#complex-form-with-sub-components)
5. [Form Best Practices](#form-best-practices)

---

## Overview

### Form Stack

- **Form Library**: React Hook Form 7.x
- **Validation**: Yup schemas
- **Components**: Custom form components from `@/components/form/`

### Key Principles

1. **Always use React Hook Form** - Never implement manual form validation
2. **Define validation schemas** - Use Yup for all validation logic
3. **Use Controller component** - For controlled inputs
4. **Accessibility is mandatory** - Add ARIA labels, keyboard navigation
5. **Component size management** - Keep forms under 300 lines, extract sub-components

---

## Basic Form

### Simple Form Template

```tsx
// src/components/form/MyForm/MyForm.tsx
import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import Input from '@/components/form/Input'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'

const schema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required')
})

interface FormData {
  name: string
  email: string
}

const MyForm: React.FC = () => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      email: ''
    }
  })

  const onSubmit = async (data: FormData) => {
    console.log(data)
    // Submit to store
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            label="Name"
            error={errors.name?.message}
            required
          />
        )}
      />

      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            label="Email"
            type="email"
            error={errors.email?.message}
            required
          />
        )}
      />

      <Button
        type="submit"
        variant={ButtonType.PRIMARY}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  )
}

export default MyForm
```

---

## Form with Validation

### Validation Schema

Extract validation schemas to separate files:

```typescript
// src/components/form/MyForm/formSchema.ts
import * as yup from 'yup'

export const myFormSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(3, 'Name must be at least 3 characters'),

  email: yup
    .string()
    .email('Invalid email format')
    .required('Email is required'),

  age: yup
    .number()
    .typeError('Age must be a number')
    .positive('Age must be positive')
    .integer('Age must be an integer')
    .min(18, 'Must be at least 18')
    .max(100, 'Must be under 100')
    .nullable(),

  website: yup
    .string()
    .url('Must be a valid URL')
    .nullable(),

  terms: yup
    .boolean()
    .oneOf([true], 'You must accept the terms')
})

export type MyFormData = yup.InferType<typeof myFormSchema>
```

### Form with Schema

```tsx
import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { myFormSchema, MyFormData } from './formSchema'
import Input from '@/components/form/Input'
import Checkbox from '@/components/form/Checkbox'

const MyForm: React.FC = () => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<MyFormData>({
    resolver: yupResolver(myFormSchema)
  })

  const onSubmit = async (data: MyFormData) => {
    // Handle form submission
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            label="Name"
            error={errors.name?.message}
            hint="Enter your full name"
            required
          />
        )}
      />

      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            label="Email"
            type="email"
            error={errors.email?.message}
            required
          />
        )}
      />

      <Controller
        name="age"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            label="Age"
            type="number"
            error={errors.age?.message}
          />
        )}
      />

      <Controller
        name="terms"
        control={control}
        render={({ field }) => (
          <Checkbox
            {...field}
            label="I accept the terms and conditions"
            error={errors.terms?.message}
          />
        )}
      />

      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  )
}
```

---

## Complex Form with Sub-Components

### File Structure

For forms over 200 lines, split into multiple files:

```
MyComplexForm/
├── index.tsx               # Main form component (<300 lines)
├── formSchema.ts          # Yup validation schemas
├── formTypes.ts           # TypeScript interfaces
├── formHelpers.ts         # Helper functions
├── useMyComplexForm.ts    # Custom hook for form logic
├── FormSection1.tsx       # Sub-component for section 1
├── FormSection2.tsx       # Sub-component for section 2
└── __tests__/
    └── MyComplexForm.test.tsx
```

### Custom Hook for Form Logic

```typescript
// useMyComplexForm.ts
import { useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'
import { myFormSchema, MyFormData } from './formSchema'

export const useMyComplexForm = (visible: boolean, onHide: () => void) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const form = useForm<MyFormData>({
    resolver: yupResolver(myFormSchema)
  })

  const handleClose = useCallback(() => {
    form.reset()
    onHide()
  }, [form, onHide])

  // Auto-focus first input when form opens
  useFocusOnVisible(inputRef, visible)

  const onSubmit = async (data: MyFormData) => {
    try {
      // Handle submission
      console.log(data)
      handleClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return {
    form,
    inputRef,
    handleClose,
    onSubmit: form.handleSubmit(onSubmit)
  }
}
```

### Main Form Component

```tsx
// index.tsx
import React from 'react'
import { Controller } from 'react-hook-form'
import Popup from '@/components/Popup'
import { useMyComplexForm } from './useMyComplexForm'
import { FormSection1 } from './FormSection1'
import { FormSection2 } from './FormSection2'

interface MyComplexFormProps {
  visible: boolean
  onHide: () => void
}

const MyComplexForm: React.FC<MyComplexFormProps> = ({ visible, onHide }) => {
  const { form, inputRef, handleClose, onSubmit } = useMyComplexForm(visible, onHide)

  return (
    <Popup
      visible={visible}
      onHide={handleClose}
      header="Complex Form"
      submitText="Save"
      onSubmit={onSubmit}
      submitDisabled={form.formState.isSubmitting}
    >
      <form className="flex flex-col gap-6">
        <FormSection1 control={form.control} errors={form.formState.errors} inputRef={inputRef} />
        <FormSection2 control={form.control} errors={form.formState.errors} />
      </form>
    </Popup>
  )
}

export default MyComplexForm
```

### Form Section Component

```tsx
// FormSection1.tsx
import React from 'react'
import { Controller, Control } from 'react-hook-form'
import Input from '@/components/form/Input'
import { MyFormData } from './formTypes'

interface FormSection1Props {
  control: Control<MyFormData>
  errors: any
  inputRef?: React.RefObject<HTMLInputElement>
}

export const FormSection1: React.FC<FormSection1Props> = ({
  control,
  errors,
  inputRef
}) => {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h3 text-text-primary">Section 1</h3>

      <Controller
        name="field1"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            ref={inputRef}
            label="Field 1"
            error={errors.field1?.message}
            required
          />
        )}
      />

      <Controller
        name="field2"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            label="Field 2"
            error={errors.field2?.message}
          />
        )}
      />
    </div>
  )
}
```

---

## Form Best Practices

### 1. Use React Hook Form + Yup

Never implement manual form validation:

```tsx
// ✅ CORRECT: Use React Hook Form + Yup
const { control, handleSubmit } = useForm({
  resolver: yupResolver(schema)
})

// ❌ WRONG: Manual validation
const [errors, setErrors] = useState({})
const validate = () => {
  if (!name) setErrors({ name: 'Required' })
}
```

### 2. Extract Validation Schemas

```tsx
// ✅ CORRECT: Separate schema file
// formSchema.ts
export const schema = yup.object({ /* ... */ })

// ❌ WRONG: Schema in component
const MyForm = () => {
  const schema = yup.object({ /* ... */ })
}
```

### 3. Use Controller for Controlled Inputs

```tsx
// ✅ CORRECT: Use Controller
<Controller
  name="email"
  control={control}
  render={({ field }) => <Input {...field} />}
/>

// ❌ WRONG: Manual registration
<Input {...register('email')} />
```

### 4. Handle Loading States

```tsx
// ✅ CORRECT: Disable button while submitting
<Button
  type="submit"
  disabled={isSubmitting}
>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</Button>
```

### 5. Clean Up on Close

```tsx
// ✅ CORRECT: Reset form when modal closes
const handleClose = useCallback(() => {
  form.reset()
  onHide()
}, [form, onHide])
```

### 6. Accessibility

```tsx
// ✅ CORRECT: Proper labels and ARIA
<Controller
  name="email"
  control={control}
  render={({ field }) => (
    <Input
      {...field}
      label="Email"
      aria-label="Email address"
      aria-required="true"
      aria-invalid={!!errors.email}
      error={errors.email?.message}
      required
    />
  )}
/>
```

### 7. Component Size Management

Keep forms under 300 lines:
- Extract validation schemas to `formSchema.ts`
- Extract types to `formTypes.ts`
- Extract helpers to `formHelpers.ts`
- Extract complex logic to custom hooks `useMyForm.ts`
- Split large forms into sub-components

---

## Available Form Components

Located in `src/components/form/`:

- `Input` - Text input
- `Textarea` - Multi-line text
- `Select` - Dropdown select
- `MultiSelect` - Multiple selection dropdown
- `Autocomplete` - Autocomplete input
- `Checkbox` - Checkbox input
- `RadioButton` - Radio button
- `RadioGroup` - Radio button group
- `Switch` - Toggle switch
- `File` - File upload
- `FilesListInput` - Multiple file upload

---

## Related Guides
- [Component Patterns](../components/component-patterns.md) - Basic component structure
- [Custom Hooks](./custom-hooks.md) - Creating custom hooks
- [Modal Patterns](./modal-patterns.md) - Forms in modals
- [State Management](./state-management.md) - Form submission to stores
