import { CSVService } from "../CSVService";
import { promises as fs } from "fs";
import * as path from "path";
import { CSVRow, Participant } from "../../../types";

// Mock fs module
jest.mock("fs", () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    copyFile: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe("CSVService", () => {
  let csvService: CSVService;
  const testRaffleId = "test-raffle-123";

  beforeEach(() => {
    csvService = new CSVService();
    jest.clearAllMocks();
  });

  describe("validateAndParseCSV", () => {
    const validCSVContent = `Username,First Name,Last Name,User Email ID,Phone Number,Product Name,Currency,Ticket Price,Ticket Number,Order ID,Order Status,Order Amount,Ticket Purchased Date,Status,User Billing Fist Name,User Billing Last name,Billing Email address,Billing Phone Number,Billing Company Name,Shipping Company Name,Billing Country / Region,Billing Address Line 1,Billing Address Line 2,Billing Town / City,Billing State,Billing PIN Code,Stream ID,User Profile
user1,John,Doe,john@example.com,1234567890,Test Product,USD,1.00,1,#ORDER1,Processing,1.00,2025-01-01,Active,John,Doe,john@example.com,1234567890,,,,,,,,,N/A,https://example.com/avatar1.jpg
user2,Jane,Smith,jane@example.com,0987654321,Test Product,USD,1.00,2,#ORDER2,Processing,1.00,2025-01-01,Active,Jane,Smith,jane@example.com,0987654321,,,,,,,,,N/A,https://example.com/avatar2.jpg`;

    const invalidCSVContent = `Username,Ticket Number
user1,
,2`;

    beforeEach(() => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1000,
      } as any);
    });

    it("should validate and parse valid CSV file", async () => {
      mockFs.readFile.mockResolvedValue(validCSVContent);

      const result = await csvService.validateAndParseCSV(
        "/test/file.csv",
        testRaffleId
      );

      expect(result.isValid).toBe(true);
      expect(result.participantCount).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.preview).toHaveLength(2);
      expect(result.preview[0].username).toBe("user1");
      expect(result.preview[0].ticketNumber).toBe("1");
      expect(result.preview[1].username).toBe("user2");
      expect(result.preview[1].ticketNumber).toBe("2");
    });

    it("should detect missing required columns", async () => {
      const csvWithMissingColumns = `Username,First Name
user1,John`;
      mockFs.readFile.mockResolvedValue(csvWithMissingColumns);

      const result = await csvService.validateAndParseCSV(
        "/test/file.csv",
        testRaffleId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2); // Missing Ticket Number and User Profile
      expect(result.errors[0].type).toBe("missing_column");
      expect(result.errors[0].column).toBe("Ticket Number");
      expect(result.errors[1].column).toBe("User Profile");
    });

    it("should detect duplicate ticket numbers", async () => {
      const csvWithDuplicates = `Username,Ticket Number,User Profile
user1,1,https://example.com/avatar1.jpg
user2,1,https://example.com/avatar2.jpg`;
      mockFs.readFile.mockResolvedValue(csvWithDuplicates);

      const result = await csvService.validateAndParseCSV(
        "/test/file.csv",
        testRaffleId
      );

      expect(result.isValid).toBe(false);
      expect(result.duplicateTickets).toContain("1");
      expect(result.errors.some((e) => e.type === "duplicate_ticket")).toBe(
        true
      );
    });

    it("should detect empty required fields", async () => {
      mockFs.readFile.mockResolvedValue(invalidCSVContent);

      const result = await csvService.validateAndParseCSV(
        "/test/file.csv",
        testRaffleId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.type === "empty_required_field")).toBe(
        true
      );
    });

    it("should validate URL format", async () => {
      const csvWithInvalidURL = `Username,Ticket Number,User Profile
user1,1,not-a-valid-url`;
      mockFs.readFile.mockResolvedValue(csvWithInvalidURL);

      const result = await csvService.validateAndParseCSV(
        "/test/file.csv",
        testRaffleId
      );

      expect(result.warnings.some((w) => w.type === "invalid_url")).toBe(true);
    });

    it("should handle file size validation", async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 60 * 1024 * 1024, // 60MB - exceeds 50MB limit
      } as any);

      const result = await csvService.validateAndParseCSV(
        "/test/file.csv",
        testRaffleId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain(
        "exceeds maximum allowed size"
      );
    });

    it("should handle file not found", async () => {
      mockFs.stat.mockRejectedValue(
        new Error("ENOENT: no such file or directory")
      );

      const result = await csvService.validateAndParseCSV(
        "/nonexistent/file.csv",
        testRaffleId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe("File not found");
    });

    it("should handle empty CSV file", async () => {
      mockFs.readFile.mockResolvedValue("");

      const result = await csvService.validateAndParseCSV(
        "/test/file.csv",
        testRaffleId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe("CSV file is empty");
    });

    it("should limit preview rows", async () => {
      // Create CSV with 15 rows
      const headers = "Username,Ticket Number,User Profile\n";
      const rows = Array.from(
        { length: 15 },
        (_, i) => `user${i + 1},${i + 1},https://example.com/avatar${i + 1}.jpg`
      ).join("\n");
      const largeCsv = headers + rows;

      mockFs.readFile.mockResolvedValue(largeCsv);

      const result = await csvService.validateAndParseCSV(
        "/test/file.csv",
        testRaffleId,
        { maxPreviewRows: 5 }
      );

      expect(result.participantCount).toBe(15);
      expect(result.preview).toHaveLength(5); // Limited to 5 preview rows
    });
  });

  describe("saveCSVFile", () => {
    it("should save CSV file to raffle directory", async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);

      const result = await csvService.saveCSVFile(
        testRaffleId,
        "/source/file.csv"
      );

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining(`raffles/${testRaffleId}`),
        { recursive: true }
      );
      expect(mockFs.copyFile).toHaveBeenCalledWith(
        "/source/file.csv",
        expect.stringContaining("participants.csv")
      );
      expect(result).toContain("participants.csv");
    });

    it("should handle save errors", async () => {
      mockFs.mkdir.mockRejectedValue(new Error("Permission denied"));

      await expect(
        csvService.saveCSVFile(testRaffleId, "/source/file.csv")
      ).rejects.toThrow("Failed to save CSV file");
    });
  });

  describe("loadParticipants", () => {
    it("should load participants from CSV file", async () => {
      const csvContent = `Username,First Name,Last Name,User Email ID,Phone Number,Ticket Number,User Profile
user1,John,Doe,john@example.com,1234567890,1,https://example.com/avatar1.jpg
user2,Jane,Smith,jane@example.com,0987654321,2,https://example.com/avatar2.jpg`;

      mockFs.readFile.mockResolvedValue(csvContent);

      const participants = await csvService.loadParticipants(
        "/test/file.csv",
        testRaffleId
      );

      expect(participants).toHaveLength(2);
      expect(participants[0].username).toBe("user1");
      expect(participants[0].firstName).toBe("John");
      expect(participants[0].raffleId).toBe(testRaffleId);
      expect(participants[1].username).toBe("user2");
      expect(participants[1].lastName).toBe("Smith");
    });

    it("should handle load errors", async () => {
      mockFs.readFile.mockRejectedValue(new Error("File not found"));

      await expect(
        csvService.loadParticipants("/nonexistent/file.csv", testRaffleId)
      ).rejects.toThrow("Failed to load participants");
    });
  });

  describe("exportParticipants", () => {
    const mockParticipants: Participant[] = [
      {
        id: "1",
        raffleId: testRaffleId,
        username: "user1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "1234567890",
        profileImageUrl: "https://example.com/avatar1.jpg",
        ticketNumber: "1",
        importDate: new Date("2025-01-01"),
        productName: "Test Product",
        currency: "USD",
        ticketPrice: 1.0,
      },
      {
        id: "2",
        raffleId: testRaffleId,
        username: "user2",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phoneNumber: "0987654321",
        profileImageUrl: "https://example.com/avatar2.jpg",
        ticketNumber: "2",
        importDate: new Date("2025-01-01"),
      },
    ];

    it("should export participants to CSV", async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      await csvService.exportParticipants(
        mockParticipants,
        "/output/export.csv"
      );

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/output/export.csv",
        expect.stringContaining("Username,First Name,Last Name"),
        "utf8"
      );
    });

    it("should export with metadata when requested", async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      await csvService.exportParticipants(
        mockParticipants,
        "/output/export.csv",
        {
          includeMetadata: true,
        }
      );

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/output/export.csv",
        expect.stringContaining("Product Name,Currency,Ticket Price"),
        "utf8"
      );
    });

    it("should export without metadata when not requested", async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      await csvService.exportParticipants(
        mockParticipants,
        "/output/export.csv",
        {
          includeMetadata: false,
        }
      );

      const writeCall = mockFs.writeFile.mock.calls[0];
      const csvContent = writeCall[1] as string;

      expect(csvContent).not.toContain("Product Name");
      expect(csvContent).not.toContain("Currency");
    });

    it("should handle export errors", async () => {
      mockFs.writeFile.mockRejectedValue(new Error("Permission denied"));

      await expect(
        csvService.exportParticipants(mockParticipants, "/output/export.csv")
      ).rejects.toThrow("Failed to export participants");
    });
  });

  describe("getParticipantCount", () => {
    it("should return correct participant count", async () => {
      const csvContent = `Username,Ticket Number,User Profile
user1,1,https://example.com/avatar1.jpg
user2,2,https://example.com/avatar2.jpg
user3,3,https://example.com/avatar3.jpg`;

      mockFs.readFile.mockResolvedValue(csvContent);

      const count = await csvService.getParticipantCount("/test/file.csv");

      expect(count).toBe(3);
    });

    it("should handle count errors", async () => {
      mockFs.readFile.mockRejectedValue(new Error("File not found"));

      await expect(
        csvService.getParticipantCount("/nonexistent/file.csv")
      ).rejects.toThrow("Failed to get participant count");
    });
  });

  describe("deleteCSVFile", () => {
    it("should delete CSV file", async () => {
      mockFs.unlink.mockResolvedValue(undefined);

      await csvService.deleteCSVFile("/test/file.csv");

      expect(mockFs.unlink).toHaveBeenCalledWith("/test/file.csv");
    });

    it("should handle file not found gracefully", async () => {
      mockFs.unlink.mockRejectedValue(
        new Error("ENOENT: no such file or directory")
      );

      // Should not throw error
      await expect(
        csvService.deleteCSVFile("/nonexistent/file.csv")
      ).resolves.toBeUndefined();
    });

    it("should handle other delete errors", async () => {
      mockFs.unlink.mockRejectedValue(new Error("Permission denied"));

      await expect(csvService.deleteCSVFile("/test/file.csv")).rejects.toThrow(
        "Failed to delete CSV file"
      );
    });
  });

  describe("createSampleCSV", () => {
    it("should create sample CSV with specified participant count", async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      await csvService.createSampleCSV("/output/sample.csv", 5);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/output/sample.csv",
        expect.stringContaining("user1,First1,Last1"),
        "utf8"
      );

      const writeCall = mockFs.writeFile.mock.calls[0];
      const csvContent = writeCall[1] as string;
      const lines = csvContent.split("\n");

      // Should have header + 5 data rows
      expect(lines.length).toBe(6);
    });

    it("should create sample CSV with default participant count", async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      await csvService.createSampleCSV("/output/sample.csv");

      const writeCall = mockFs.writeFile.mock.calls[0];
      const csvContent = writeCall[1] as string;
      const lines = csvContent.split("\n");

      // Should have header + 10 data rows (default)
      expect(lines.length).toBe(11);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle malformed CSV data", async () => {
      const malformedCSV = `Username,Ticket Number,User Profile
user1,1,https://example.com/avatar1.jpg
user2,"broken quote,2,https://example.com/avatar2.jpg`;

      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1000,
      } as any);
      mockFs.readFile.mockResolvedValue(malformedCSV);

      const result = await csvService.validateAndParseCSV(
        "/test/file.csv",
        testRaffleId
      );

      // Should handle parsing errors gracefully
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("CSV parsing error"))
      ).toBe(true);
    });

    it("should validate file extension", async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1000,
      } as any);

      const result = await csvService.validateAndParseCSV(
        "/test/file.txt",
        testRaffleId
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain("File extension");
    });

    it("should handle non-numeric ticket numbers", async () => {
      const csvWithNonNumericTickets = `Username,Ticket Number,User Profile
user1,ABC123,https://example.com/avatar1.jpg`;

      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1000,
      } as any);
      mockFs.readFile.mockResolvedValue(csvWithNonNumericTickets);

      const result = await csvService.validateAndParseCSV(
        "/test/file.csv",
        testRaffleId
      );

      expect(
        result.warnings.some((w) => w.message.includes("not numeric"))
      ).toBe(true);
    });
  });
});
