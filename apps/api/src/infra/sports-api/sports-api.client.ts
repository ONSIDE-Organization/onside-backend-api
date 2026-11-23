// src/infra/sports-api/sports-api.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface BzzoiroEvent {
  id: number;
  home: { id: number; name: string };
  away: { id: number; name: string };
  kickoff_at: string;
  status: 'upcoming' | 'live' | 'finished' | 'cancelled' | 'postponed' | 'unresolved';
  score: { home: number | null; away: number | null };
  round_number: number | null;
  season_id: number;
}

export interface BzzoiroEventsResponse {
  count: number;
  results: BzzoiroEvent[];
  next: string | null;
}

@Injectable()
export class SportsApiClient {
  private readonly logger = new Logger(SportsApiClient.name);
  private readonly http: AxiosInstance;

  constructor(config: ConfigService) {
    const apiKey = config.getOrThrow<string>('sportsApi.key');
    const baseUrl = config.get<string>('sportsApi.baseUrl');

    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 10_000,
      headers: {
        Authorization: `Token ${apiKey}`,
        Accept: 'application/json',
      },
    });
  }

  /**
   * Fetch fixtures for a given date range.
   * Bzzoiro v2: GET /events/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
   */
  // async getEvents(params: {
  //   dateFrom?: string;
  //   dateTo?: string;
  //   leagueId?: number;
  //   seasonId?: number;
  //   limit?: number;
  //   offset?: number;
  // }): Promise<BzzoiroEventsResponse> {
  //   const { data } = await this.http.get<BzzoiroEventsResponse>('/events/', {
  //     params: {
  //       date_from: params.dateFrom,
  //       date_to: params.dateTo,
  //       league_id: params.leagueId,
  //       season_id: params.seasonId,
  //       limit: params.limit ?? 50,
  //       offset: params.offset ?? 0,
  //     },
  //   });
  //   return data;
  // }
// src/infra/sports-api/sports-api.client.ts
async getEvents(params: {
  dateFrom?: string;
  dateTo?: string;
  leagueId?: number; // ← Add this
  seasonId?: number;
  limit?: number;
  offset?: number;
}): Promise<BzzoiroEventsResponse> {
  const { data } = await this.http.get<BzzoiroEventsResponse>('/events/', {
    params: {
      date_from: params.dateFrom,
      date_to: params.dateTo,
      league_id: params.leagueId, // ← Add this
      season_id: params.seasonId,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    },
  });
  return data;
}
  /**
   * Fetch a single event by Bzzoiro ID.
   */
  async getEvent(eventId: number): Promise<BzzoiroEvent> {
    const { data } = await this.http.get<BzzoiroEvent>(`/events/${eventId}/`);
    return data;
  }

  /**
   * Fetch live events (for polling during match windows).
   */
  async getLiveEvents(): Promise<BzzoiroEventsResponse> {
    const { data } = await this.http.get<BzzoiroEventsResponse>('/events/live/');
    return data;
  }



/**
 * 
 * @param leagueId 
 * @returns 
 */
async getCurrentSeason(leagueId: number): Promise<{ id: number; name: string }> {
  const { data } = await this.http.get(`/leagues/${leagueId}/season/`);
  return data;
}

}