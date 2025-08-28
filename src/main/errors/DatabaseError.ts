export class DatabaseError extends Error {
  public readonly type: 'connection' | 'constraint' | 'disk_space' | 'corruption';
  public readonly operation: string;
  public readonly recoverable: boolean;

  constructor(
    type: 'connection' | 'constraint' | 'disk_space' | 'corruption',
    operation: string,
    message: string,
    recoverable: boolean
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.type = type;
    this.operation = operation;
    this.recoverable = recoverable;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }

  toString(): string {
    return `${this.name} [${this.type}] in ${this.operation}: ${this.message}`;
  }

  toJSON(): object {
    return {
      name: this.name,
      type: this.type,
      operation: this.operation,
      message: this.message,
      recoverable: this.recoverable,
      stack: this.stack
    };
  }
}