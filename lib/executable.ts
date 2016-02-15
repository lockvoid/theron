export interface TheronExecutable extends Function {
  (sql): string;
}
