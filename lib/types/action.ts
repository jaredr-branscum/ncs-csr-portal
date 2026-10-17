/**
 * Generic Discriminated Union for Server Action outcomes ('use server')
 */

export type ActionSuccess<T = void> = {
  success: true;
  data?: T;
  formError?: never;
  fieldErrors?: never;
};

export type ActionFailure = {
  success: false;
  /** Global form/domain rejection message rendered in the top-level alert banner */
  formError?: string;
  /** Field-specific validation errors keyed by input name */
  fieldErrors?: Record<string, string>;
};

export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;
