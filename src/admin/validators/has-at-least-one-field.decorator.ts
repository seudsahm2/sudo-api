import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export function HasAtLeastOneField(
  fields: string[],
  validationOptions?: ValidationOptions,
): ClassDecorator {
  return (target: object) => {
    registerDecorator({
      name: 'hasAtLeastOneField',
      target: target.constructor,
      propertyName: 'atLeastOneField',
      constraints: [fields],
      options: validationOptions,
      validator: {
        validate(_: unknown, args: ValidationArguments): boolean {
          const [allowedFields] = args.constraints as [string[]];
          const payload = args.object as Record<string, unknown>;

          return allowedFields.some((field) => payload[field] !== undefined);
        },
      },
    });
  };
}
