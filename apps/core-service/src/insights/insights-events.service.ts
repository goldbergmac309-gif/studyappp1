import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export type InsightSessionEvent = {
  sessionId: string;
  status?: 'PENDING' | 'READY' | 'FAILED';
};

@Injectable()
export class InsightsEventsService {
  private streams = new Map<string, Subject<InsightSessionEvent>>();

  emit(sessionId: string, status?: InsightSessionEvent['status']) {
    const stream = this.ensure(sessionId);
    stream.next({ sessionId, status });
    if (status === 'READY' || status === 'FAILED') {
      stream.complete();
      this.streams.delete(sessionId);
    }
  }

  stream(sessionId: string): Observable<InsightSessionEvent> {
    const stream = this.ensure(sessionId);
    return stream.asObservable();
  }

  private ensure(sessionId: string): Subject<InsightSessionEvent> {
    let current = this.streams.get(sessionId);
    if (!current || current.closed) {
      current = new Subject<InsightSessionEvent>();
      this.streams.set(sessionId, current);
    }
    return current;
  }
}
