import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs/promises';
import { Raffle, Drawing } from '../../types';
import { DatabaseError } from '../errors/DatabaseError';

export class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'raffle-app.db');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure the directory exists
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
      
      // Open database connection
      this.db = new Database(this.dbPath);
      
      // Enable WAL mode for better performance
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 1000');
      this.db.pragma('temp_store = memory');
      
      // Create tables
      await this.createTables();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new DatabaseError('connection', 'initialize', (error as any).message, false);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createRafflesTable = `
      CREATE TABLE IF NOT EXISTS raffles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        background_image_path TEXT,
        csv_file_path TEXT NOT NULL,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'completed', 'archived')),
        animation_style TEXT DEFAULT 'cs2_case' CHECK (animation_style IN ('cs2_case', 'spinning_wheel', 'card_flip', 'slot_machine', 'particle_explosion', 'zoom_fade')),
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        modified_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        custom_settings TEXT,
        participant_count INTEGER DEFAULT 0
      )
    `;

    const createDrawingsTable = `
      CREATE TABLE IF NOT EXISTS drawings (
        id TEXT PRIMARY KEY,
        raffle_id TEXT NOT NULL,
        winner_id TEXT NOT NULL,
        winner_username TEXT NOT NULL,
        winner_ticket_number TEXT NOT NULL,
        draw_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        random_org_verification TEXT,
        recording_file_path TEXT,
        draw_settings TEXT,
        FOREIGN KEY (raffle_id) REFERENCES raffles(id) ON DELETE CASCADE
      )
    `;

    const createSettingsTable = `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        category TEXT,
        modified_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for performance
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_drawings_raffle_id ON drawings(raffle_id)',
      'CREATE INDEX IF NOT EXISTS idx_raffles_status ON raffles(status)',
      'CREATE INDEX IF NOT EXISTS idx_raffles_modified_date ON raffles(modified_date)',
      'CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category)'
    ];

    try {
      this.db.exec(createRafflesTable);
      this.db.exec(createDrawingsTable);
      this.db.exec(createSettingsTable);
      
      createIndexes.forEach(indexSql => {
        this.db!.exec(indexSql);
      });
      
      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Failed to create tables:', error);
      throw new DatabaseError('constraint', 'createTables', (error as any).message, false);
    }
  }

  // Raffle operations
  async createRaffle(raffle: Omit<Raffle, 'id'>): Promise<Raffle> {
    if (!this.db) throw new Error('Database not initialized');

    const id = this.generateId();
    const now = new Date().toISOString();
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO raffles (
          id, name, background_image_path, csv_file_path, status, 
          animation_style, created_date, modified_date, custom_settings, participant_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        raffle.name,
        raffle.backgroundImagePath || null,
        raffle.csvFilePath,
        raffle.status,
        raffle.animationStyle,
        now,
        now,
        JSON.stringify(raffle.customSettings || {}),
        raffle.participantCount || 0
      );
      
      return {
        id,
        ...raffle,
        createdDate: new Date(now),
        modifiedDate: new Date(now)
      };
    } catch (error) {
      console.error('Failed to create raffle:', error);
      throw new DatabaseError('constraint', 'createRaffle', (error as any).message, true);
    }
  }

  async updateRaffle(id: string, updates: Partial<Raffle>): Promise<Raffle> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    
    try {
      const setClause = [];
      const values = [];
      
      if (updates.name !== undefined) {
        setClause.push('name = ?');
        values.push(updates.name);
      }
      if (updates.backgroundImagePath !== undefined) {
        setClause.push('background_image_path = ?');
        values.push(updates.backgroundImagePath);
      }
      if (updates.csvFilePath !== undefined) {
        setClause.push('csv_file_path = ?');
        values.push(updates.csvFilePath);
      }
      if (updates.status !== undefined) {
        setClause.push('status = ?');
        values.push(updates.status);
      }
      if (updates.animationStyle !== undefined) {
        setClause.push('animation_style = ?');
        values.push(updates.animationStyle);
      }
      if (updates.customSettings !== undefined) {
        setClause.push('custom_settings = ?');
        values.push(JSON.stringify(updates.customSettings));
      }
      if (updates.participantCount !== undefined) {
        setClause.push('participant_count = ?');
        values.push(updates.participantCount);
      }
      
      setClause.push('modified_date = ?');
      values.push(now);
      values.push(id);
      
      const stmt = this.db.prepare(`
        UPDATE raffles SET ${setClause.join(', ')} WHERE id = ?
      `);
      
      const result = stmt.run(...values);
      
      if (result.changes === 0) {
        throw new Error(`Raffle with id ${id} not found`);
      }
      
      return await this.getRaffle(id) as Raffle;
    } catch (error) {
      console.error('Failed to update raffle:', error);
      throw new DatabaseError('constraint', 'updateRaffle', (error as any).message, true);
    }
  }

  async deleteRaffle(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('DELETE FROM raffles WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        throw new Error(`Raffle with id ${id} not found`);
      }
    } catch (error) {
      console.error('Failed to delete raffle:', error);
      throw new DatabaseError('constraint', 'deleteRaffle', (error as any).message, true);
    }
  }

  async getRaffle(id: string): Promise<Raffle | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('SELECT * FROM raffles WHERE id = ?');
      const row = stmt.get(id) as any;
      
      if (!row) return null;
      
      return this.mapRowToRaffle(row);
    } catch (error) {
      console.error('Failed to get raffle:', error);
      throw new DatabaseError('connection', 'getRaffle', (error as any).message, true);
    }
  }

  async getAllRaffles(): Promise<Raffle[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('SELECT * FROM raffles ORDER BY modified_date DESC');
      const rows = stmt.all() as any[];
      
      return rows.map(row => this.mapRowToRaffle(row));
    } catch (error) {
      console.error('Failed to get all raffles:', error);
      throw new DatabaseError('connection', 'getAllRaffles', (error as any).message, true);
    }
  }

  // Drawing operations
  async recordDrawing(drawing: Omit<Drawing, 'id'>): Promise<Drawing> {
    if (!this.db) throw new Error('Database not initialized');

    const id = this.generateId();
    const now = new Date().toISOString();
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO drawings (
          id, raffle_id, winner_id, winner_username, winner_ticket_number, 
          draw_timestamp, random_org_verification, recording_file_path, draw_settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        drawing.raffleId,
        drawing.winnerId,
        drawing.winnerUsername,
        drawing.winnerTicketNumber,
        now,
        drawing.randomOrgVerification || null,
        drawing.recordingFilePath || null,
        JSON.stringify(drawing.drawSettings || {})
      );
      
      return {
        id,
        ...drawing,
        drawTimestamp: new Date(now)
      };
    } catch (error) {
      console.error('Failed to record drawing:', error);
      throw new DatabaseError('constraint', 'recordDrawing', (error as any).message, true);
    }
  }

  async getDrawingHistory(raffleId?: string): Promise<Drawing[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let stmt;
      let rows;
      
      if (raffleId) {
        stmt = this.db.prepare('SELECT * FROM drawings WHERE raffle_id = ? ORDER BY draw_timestamp DESC');
        rows = stmt.all(raffleId) as any[];
      } else {
        stmt = this.db.prepare('SELECT * FROM drawings ORDER BY draw_timestamp DESC');
        rows = stmt.all() as any[];
      }
      
      return rows.map(row => this.mapRowToDrawing(row));
    } catch (error) {
      console.error('Failed to get drawing history:', error);
      throw new DatabaseError('connection', 'getDrawingHistory', (error as any).message, true);
    }
  }

  // Settings operations
  async setSetting(key: string, value: string, category: string = 'general'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, category, modified_date) 
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(key, value, category, new Date().toISOString());
    } catch (error) {
      console.error('Failed to set setting:', error);
      throw new DatabaseError('constraint', 'setSetting', (error as any).message, true);
    }
  }

  async getSetting(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
      const row = stmt.get(key) as any;
      
      return row ? row.value : null;
    } catch (error) {
      console.error('Failed to get setting:', error);
      throw new DatabaseError('connection', 'getSetting', (error as any).message, true);
    }
  }

  async getSettingsByCategory(category: string): Promise<Record<string, string>> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare('SELECT key, value FROM settings WHERE category = ?');
      const rows = stmt.all(category) as any[];
      
      const settings: Record<string, string> = {};
      rows.forEach(row => {
        settings[row.key] = row.value;
      });
      
      return settings;
    } catch (error) {
      console.error('Failed to get settings by category:', error);
      throw new DatabaseError('connection', 'getSettingsByCategory', (error as any).message, true);
    }
  }

  // Utility methods
  private mapRowToRaffle(row: any): Raffle {
    return {
      id: row.id,
      name: row.name,
      backgroundImagePath: row.background_image_path,
      csvFilePath: row.csv_file_path,
      status: row.status,
      animationStyle: row.animation_style,
      createdDate: new Date(row.created_date),
      modifiedDate: new Date(row.modified_date),
      customSettings: row.custom_settings ? JSON.parse(row.custom_settings) : {},
      participantCount: row.participant_count || 0
    };
  }

  private mapRowToDrawing(row: any): Drawing {
    return {
      id: row.id,
      raffleId: row.raffle_id,
      winnerId: row.winner_id,
      winnerUsername: row.winner_username,
      winnerTicketNumber: row.winner_ticket_number,
      drawTimestamp: new Date(row.draw_timestamp),
      randomOrgVerification: row.random_org_verification,
      recordingFilePath: row.recording_file_path,
      drawSettings: row.draw_settings ? JSON.parse(row.draw_settings) : {}
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }

  // Test utility method to clear all data
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      this.db.exec('DELETE FROM drawings');
      this.db.exec('DELETE FROM raffles');
      this.db.exec('DELETE FROM settings');
    } catch (error) {
      console.error('Failed to clear database data:', error);
      throw new DatabaseError('constraint', 'clearAllData', (error as any).message, true);
    }
  }

  // Migration system
  async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get current schema version
      let currentVersion = 0;
      try {
        const versionSetting = await this.getSetting('schema_version');
        currentVersion = versionSetting ? parseInt(versionSetting) : 0;
      } catch {
        // Settings table might not exist yet, start from version 0
      }

      const migrations = this.getMigrations();
      
      for (let version = currentVersion + 1; version <= migrations.length; version++) {
        const migration = migrations[version - 1];
        console.log(`Running migration ${version}: ${migration.description}`);
        
        this.db.exec(migration.sql);
        await this.setSetting('schema_version', version.toString(), 'system');
        
        console.log(`Migration ${version} completed`);
      }
    } catch (error) {
      console.error('Failed to run migrations:', error);
      throw new DatabaseError('constraint', 'runMigrations', (error as any).message, false);
    }
  }

  private getMigrations(): Array<{ description: string; sql: string }> {
    return [
      {
        description: 'Add winner_id column to drawings table',
        sql: `
          ALTER TABLE drawings ADD COLUMN winner_id TEXT;
          UPDATE drawings SET winner_id = winner_username WHERE winner_id IS NULL;
        `
      }
    ];
  }
}