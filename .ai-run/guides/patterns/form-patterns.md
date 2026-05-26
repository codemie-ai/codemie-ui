# Form Patterns — Factory Guide

## Stack

| Layer | Library | Version |
|-------|---------|---------|
| Form state | React Hook Form | 7.x |
| Validation | Yup | via `@hookform/resolvers/yup` |
| Form components | `src/components/form/` | project-local |

---

## Bad / Best

| Bad | Best |
|-----|------|
| Manual `useState` + validate function | `useForm` + `yupResolver(schema)` |
| Schema defined inside component body | Separate `formSchema.ts` file |
| `<input {...register('field')} />` | `<Controller name='field' control={control} render={...} />` |
| Passing `control` to leaf components | Pass explicit `value`, `onChange`, `error` props |
| Form component > 300 lines | Split into sub-components + custom hook |
| `||` for default values | `??` (nullish coalescing) |
| Arbitrary px values `p-[18px]` | Tailwind scale `p-4` |
| Forget `form.reset()` on close | Call in `handleClose` callback |

---

## Available Form Components (`src/components/form/`)

| Component | Use for |
|-----------|---------|
| `Input` | Single-line text |
| `Textarea` | Multi-line text |
| `Select` | Single dropdown |
| `MultiSelect` | Multi-select dropdown |
| `Autocomplete` | Typeahead input |
| `Checkbox` | Boolean toggle |
| `RadioButton` / `RadioGroup` | Exclusive choice |
| `Switch` | Toggle switch |
| `File` / `FilesListInput` | File upload |

---

## Minimal Form Template

```tsx
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import Input from '@/components/form/Input'

const schema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
})
type FormData = yup.InferType<typeof schema>

const MyForm = () => {
  const { control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: yupResolver(schema), defaultValues: { name: '', email: '' } })

  const onSubmit = async (data: FormData) => { /* call store */ }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-4'>
      <Controller name='name' control={control}
        render={({ field }) => <Input {...field} label='Name' error={errors.name?.message} required />} />
      <Controller name='email' control={control}
        render={({ field }) => <Input {...field} label='Email' type='email' error={errors.email?.message} required />} />
      <Button type='submit' disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit'}
      </Button>
    </form>
  )
}
```

---

## Validation Schema Structure

Keep schemas in a dedicated `formSchema.ts`:

```ts
// formSchema.ts
import * as yup from 'yup'

export const myFormSchema = yup.object({
  name: yup.string().required('Name is required').min(3, 'Min 3 chars'),
  email: yup.string().email('Invalid email').required(),
  age: yup.number().typeError('Must be a number').positive().integer().min(18).max(100).nullable(),
  website: yup.string().url('Must be a valid URL').nullable(),
  accepted: yup.boolean().oneOf([true], 'Must accept terms'),
})

export type MyFormData = yup.InferType<typeof myFormSchema>
```

Use `yup.InferType<typeof schema>` — never write the TS type separately.

---

## Displaying Field Errors

Pass `errors.<field>?.message` to the component's `error` prop:

```tsx
<Controller name='age' control={control}
  render={({ field }) => (
    <Input {...field} label='Age' type='number'
      error={errors.age?.message}
      aria-invalid={!!errors.age}
      aria-describedby={errors.age ? 'age-error' : undefined} />
  )} />
```

For inline error span:
```tsx
{errors.age && (
  <span id='age-error' className='text-text-error text-sm' role='alert'>
    {errors.age.message}
  </span>
)}
```

---

## Form with Custom Hook (Complex Forms)

Extract all logic when form approaches 200+ lines.

```ts
// useMyForm.ts
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useCallback, useRef } from 'react'
import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'
import { myFormSchema, MyFormData } from './formSchema'
import { myStore } from '@/store/myStore'

export const useMyForm = (visible: boolean, onHide: () => void) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const form = useForm<MyFormData>({ resolver: yupResolver(myFormSchema) })

  useFocusOnVisible(inputRef, visible)

  const handleClose = useCallback(() => { form.reset(); onHide() }, [form, onHide])

  const onSubmit = form.handleSubmit(async (data) => {
    await myStore.createItem(data)
    handleClose()
  })

  return { form, inputRef, handleClose, onSubmit }
}
```

The component then stays thin:
```tsx
const MyForm = ({ visible, onHide }) => {
  const { form, inputRef, handleClose, onSubmit } = useMyForm(visible, onHide)
  return (
    <Popup visible={visible} onHide={handleClose} onSubmit={onSubmit}
      submitDisabled={form.formState.isSubmitting}>
      {/* Controllers only */}
    </Popup>
  )
}
```

---

## Presentation vs Container Components

### Container / Section (can hold `control`, 200–300 lines)
- Owns `Controller` wrappers
- Coordinates section-level state
- Passed `control` + `errors` props

### Presentation / Field (< 100 lines, no RHF dependency)
```tsx
// Explicit props — no `control`, no `Controller` inside
interface EmailFieldProps {
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  error?: string
}
const EmailField = ({ value, onChange, onBlur, error }: EmailFieldProps) => (
  <Input value={value} onChange={onChange} onBlur={onBlur} error={error} label='Email' />
)

// Usage in container:
<Controller name='email' control={control}
  render={({ field, fieldState }) => (
    <EmailField {...field} error={fieldState.error?.message} />
  )} />
```

---

## File Structure for Complex Forms

```
MyComplexForm/
├── index.tsx          # Main component (<300 lines)
├── formSchema.ts      # Yup schemas + InferType exports
├── formTypes.ts       # Extra TS interfaces
├── formHelpers.ts     # Pure helper functions
├── useMyForm.ts       # Custom form hook
├── SectionA.tsx       # Sub-component for section A
└── SectionB.tsx       # Sub-component for section B
```

---

## Accessibility in Forms

| Requirement | Implementation |
|-------------|---------------|
| Visible label | `label` prop on form component, or `<label htmlFor>` |
| Required indicator | `required` prop on component |
| Error announced | `role='alert'` on error span, or `aria-live='polite'` |
| Link input to error | `aria-describedby='fieldname-error'` |
| Invalid state | `aria-invalid={!!errors.field}` |

---

## Pre-Delivery Checklist

- [ ] Schema in separate `formSchema.ts`, not in component body
- [ ] `yup.InferType` used for type — no duplicate TS interface
- [ ] All inputs use `Controller`, not `register`
- [ ] Leaf components receive explicit props, not `control`
- [ ] `form.reset()` called on modal close
- [ ] Loading state: submit button disabled + label change
- [ ] Error messages wired to `error` prop and `aria-describedby`
- [ ] Component under 300 lines
