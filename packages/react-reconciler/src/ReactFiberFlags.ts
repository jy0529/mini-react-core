export type ReactFlags = number;

export const NoFlags = /**                  */ 0b0000000000000000000000000000;
export const Placement = /**                */ 0b0000000000000000000000000010;
export const Update = /**                   */ 0b0000000000000000000000000100;
export const ChildDeletion = /**            */ 0b0000000000000000000000001000;