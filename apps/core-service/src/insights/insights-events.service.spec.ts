import { InsightsEventsService } from './insights-events.service';

describe('InsightsEventsService', () => {
  it('emits events to subscribed observers', (done) => {
    const service = new InsightsEventsService();
    const received: Array<string | undefined> = [];

    service.stream('sess-1').subscribe({
      next: (evt) => {
        received.push(evt.status);
      },
      complete: () => {
        expect(received).toEqual(['PENDING', 'READY']);
        done();
      },
    });

    service.emit('sess-1', 'PENDING');
    service.emit('sess-1', 'READY');
  });

  it('resets streams after completion', () => {
    const service = new InsightsEventsService();
    const first: Array<string | undefined> = [];
    service.stream('sess-2').subscribe({
      next: (evt) => first.push(evt.status),
    });
    service.emit('sess-2', 'FAILED');
    expect(first).toEqual(['FAILED']);

    const second: Array<string | undefined> = [];
    service.stream('sess-2').subscribe({
      next: (evt) => second.push(evt.status),
    });
    service.emit('sess-2', 'PENDING');
    expect(second).toEqual(['PENDING']);
  });
});
