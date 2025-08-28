// Validation utilities for data models
import {
  ValidationError,
  ValidationWarning,
  ValidationSchema,
  CSVRow,
  CSV_VALIDATION_SCHEMA,
  RAFFLE_VALIDATION_SCHEMA,
  Participant,
  Raffle,
  AnimationStyle,
} from "./index";

// ============================================================================
// VALIDATION UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates a single field value against schema constraints
 */
export function validateField(
  fieldName: string,
  value: any,
  schema: ValidationSchema
): ValidationError | null {
  const fieldType = schema.types[fieldName];
  const constraints = schema.constraints[fieldName];

  // Check if required field is missing
  if (
    schema.required.includes(fieldName) &&
    (value === undefined || value === null || value === "")
  ) {
    return {
      type: "empty_required_field",
      row: 0,
      column: fieldName,
      message: `Required field '${fieldName}' is empty`,
      severity: "error",
      value: String(value),
    };
  }

  // Skip validation for empty optional fields
  if (!value && !schema.required.includes(fieldName)) {
    return null;
  }

  // Type validation
  if (fieldType && !validateFieldType(value, fieldType)) {
    return {
      type: "invalid_format",
      row: 0,
      column: fieldName,
      message: `Field '${fieldName}' must be of type ${fieldType}`,
      severity: "error",
      value: String(value),
    };
  }

  // Constraint validation
  if (constraints) {
    const constraintError = validateConstraints(fieldName, value, constraints);
    if (constraintError) {
      return constraintError;
    }
  }

  return null;
}

/**
 * Validates field type
 */
function validateFieldType(value: any, expectedType: string): boolean {
  const stringValue = String(value).trim();

  switch (expectedType) {
    case "string":
      return typeof value === "string" || typeof value === "number";
    case "number":
      return !isNaN(Number(stringValue)) && stringValue !== "";
    case "boolean":
      return (
        typeof value === "boolean" ||
        ["true", "false", "1", "0"].includes(stringValue.toLowerCase())
      );
    case "date":
      return !isNaN(Date.parse(stringValue));
    case "url":
      try {
        new URL(stringValue);
        return true;
      } catch {
        return (
          stringValue.startsWith("http://") ||
          stringValue.startsWith("https://")
        );
      }
    case "email":
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(stringValue);
    default:
      return true;
  }
}

/**
 * Validates field constraints
 */
function validateConstraints(
  fieldName: string,
  value: any,
  constraints: any
): ValidationError | null {
  const stringValue = String(value);

  if (constraints.minLength && stringValue.length < constraints.minLength) {
    return {
      type: "invalid_format",
      row: 0,
      column: fieldName,
      message: `Field '${fieldName}' must be at least ${constraints.minLength} characters long`,
      severity: "error",
      value: stringValue,
    };
  }

  if (constraints.maxLength && stringValue.length > constraints.maxLength) {
    return {
      type: "invalid_format",
      row: 0,
      column: fieldName,
      message: `Field '${fieldName}' must be no more than ${constraints.maxLength} characters long`,
      severity: "error",
      value: stringValue,
    };
  }

  if (constraints.pattern && !constraints.pattern.test(stringValue)) {
    return {
      type: "invalid_format",
      row: 0,
      column: fieldName,
      message: `Field '${fieldName}' does not match required format`,
      severity: "error",
      value: stringValue,
    };
  }

  const numValue = Number(stringValue);
  if (!isNaN(numValue)) {
    if (constraints.min !== undefined && numValue < constraints.min) {
      return {
        type: "invalid_format",
        row: 0,
        column: fieldName,
        message: `Field '${fieldName}' must be at least ${constraints.min}`,
        severity: "error",
        value: stringValue,
      };
    }

    if (constraints.max !== undefined && numValue > constraints.max) {
      return {
        type: "invalid_format",
        row: 0,
        column: fieldName,
        message: `Field '${fieldName}' must be no more than ${constraints.max}`,
        severity: "error",
        value: stringValue,
      };
    }
  }

  return null;
}

// ============================================================================
// CSV VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates CSV headers against expected schema
 */
export function validateCSVHeaders(headers: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const schema = CSV_VALIDATION_SCHEMA;

  // Check for missing required columns
  for (const requiredField of schema.required) {
    if (!headers.includes(requiredField)) {
      errors.push({
        type: "missing_column",
        row: 0,
        column: requiredField,
        message: `Required column '${requiredField}' is missing`,
        severity: "error",
      });
    }
  }

  return errors;
}

/**
 * Validates a single CSV row
 */
export function validateCSVRow(
  row: CSVRow,
  rowIndex: number,
  existingTickets: Set<string>
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const schema = CSV_VALIDATION_SCHEMA;

  // Validate each field
  Object.entries(row).forEach(([fieldName, value]) => {
    const error = validateField(fieldName, value, schema);
    if (error) {
      error.row = rowIndex;
      errors.push(error);
    }
  });

  // Check for duplicate ticket numbers
  const ticketNumber = row["Ticket Number"];
  if (ticketNumber && existingTickets.has(ticketNumber)) {
    errors.push({
      type: "duplicate_ticket",
      row: rowIndex,
      column: "Ticket Number",
      message: `Duplicate ticket number '${ticketNumber}' found`,
      severity: "error",
      value: ticketNumber,
    });
  } else if (ticketNumber) {
    existingTickets.add(ticketNumber);
  }

  // Check for invalid ticket number format (should be numeric)
  if (ticketNumber && isNaN(Number(ticketNumber))) {
    warnings.push({
      type: "invalid_format",
      row: rowIndex,
      column: "Ticket Number",
      message: `Ticket number '${ticketNumber}' is not numeric`,
      severity: "warning",
      value: ticketNumber,
    });
  }

  return { errors, warnings };
}

/**
 * Converts CSV row to Participant interface
 */
export function csvRowToParticipant(
  row: CSVRow,
  raffleId: string
): Participant {
  const participant: Participant = {
    id: `${raffleId}-${row["Ticket Number"]}-${Date.now()}`,
    raffleId,
    username: row.Username,
    profileImageUrl: row["User Profile"],
    ticketNumber: row["Ticket Number"],
    importDate: new Date(),
  };

  // Only assign optional properties if they have values
  if (row["First Name"]) participant.firstName = row["First Name"];
  if (row["Last Name"]) participant.lastName = row["Last Name"];
  if (row["User Email ID"]) participant.email = row["User Email ID"];
  if (row["Phone Number"]) participant.phoneNumber = row["Phone Number"];
  if (row["Product Name"]) participant.productName = row["Product Name"];
  if (row.Currency) participant.currency = row.Currency;
  if (row["Ticket Price"])
    participant.ticketPrice = parseFloat(row["Ticket Price"]);
  if (row["Order ID"]) participant.orderId = row["Order ID"];
  if (row["Order Status"]) participant.orderStatus = row["Order Status"];
  if (row["Order Amount"])
    participant.orderAmount = parseFloat(row["Order Amount"]);
  if (row["Ticket Purchased Date"])
    participant.ticketPurchasedDate = row["Ticket Purchased Date"];
  if (row.Status) participant.status = row.Status;
  if (row["Stream ID"]) participant.streamId = row["Stream ID"];

  return participant;
}

// ============================================================================
// RAFFLE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a raffle object
 */
export function validateRaffle(raffle: Partial<Raffle>): ValidationError[] {
  const errors: ValidationError[] = [];
  const schema = RAFFLE_VALIDATION_SCHEMA;

  // Validate each field
  Object.entries(raffle).forEach(([fieldName, value]) => {
    const error = validateField(fieldName, value, schema);
    if (error) {
      errors.push(error);
    }
  });

  // Validate animation style enum
  if (
    raffle.animationStyle &&
    !Object.values(AnimationStyle).includes(raffle.animationStyle)
  ) {
    errors.push({
      type: "invalid_format",
      row: 0,
      column: "animationStyle",
      message: `Invalid animation style '${raffle.animationStyle}'`,
      severity: "error",
      value: String(raffle.animationStyle),
    });
  }

  return errors;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Checks if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitizes a string for safe usage
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>\"'&]/g, "");
}

/**
 * Generates a unique ID for participants
 */
export function generateParticipantId(
  raffleId: string,
  ticketNumber: string
): string {
  return `${raffleId}-${ticketNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
