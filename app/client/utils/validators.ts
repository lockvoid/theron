
export const EMAIL_REGEX = /^\S+@\S+\.\S+$/i;

export function combineValidators(rules: any) {
  const join = (rules) => (value, data) => rules.map(rule => rule(value, data)).filter(error => !!error)[0 /* first error */ ];

  return (data = {}) => {
    const errors = {};

    Object.keys(rules).forEach(key => {
      const rule = join([].concat(rules[key]));
      const error = rule(data[key], data);

      if (error) {
        errors[key] = error;
      }
    });

    return errors;
  };
}

export function requiredValidator(value: any): string {
  if (!value) {
    return `Can't be blank`;
  }
}

export function emailValidator(value: string): string {
  if (!EMAIL_REGEX.test(value)) {
    return `Must look like an email address`;
  }
}

export function passwordValidator(value: string): string {
  if (value && value.length < 8) {
    return `Must be 7 characters minimum`;
  }
}

export function emailUniquenessValidator(values): Promise<any> {
  const onFailure = () => {
    return Promise.reject({ email: 'An error has occured' });
  }

  const onSuccess = (unique) => {
    return unique ? Promise.resolve() : Promise.reject({ email: 'That email is taken' })
  }

  return fetch(`/api/users/email/${values.email}/validate`).then(res => res.json()).catch(onFailure).then(onSuccess);
}
