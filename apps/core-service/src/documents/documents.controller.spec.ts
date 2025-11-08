import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import type { Request } from 'express';
import { DocumentsService } from './documents.service';

describe('DocumentsController.reprocess forceOcr parsing', () => {
  let controller: DocumentsController;
  const mockService = {
    reprocess: jest
      .fn()
      .mockResolvedValue({ id: 'doc1', status: 'QUEUED' as const }),
  } as unknown as DocumentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [{ provide: DocumentsService, useValue: mockService }],
    }).compile();

    controller = moduleRef.get(DocumentsController);
  });

  function req(
    userId = 'user1',
  ): Request & { user: { id: string; email: string } } {
    return {
      user: { id: userId, email: `${userId}@example.com` },
    } as unknown as Request & { user: { id: string; email: string } };
  }

  it('forwards forceOcr=true when query is 1/true/yes (case-insensitive)', async () => {
    const spy = jest.spyOn(
      mockService as unknown as { reprocess: (...args: unknown[]) => unknown },
      'reprocess',
    );
    await controller.reprocess(req(), 'sub1', 'doc1', '1');
    expect(spy).toHaveBeenLastCalledWith('user1', 'sub1', 'doc1', true);

    await controller.reprocess(req(), 'sub1', 'doc1', 'true');
    expect(spy).toHaveBeenLastCalledWith('user1', 'sub1', 'doc1', true);

    await controller.reprocess(req(), 'sub1', 'doc1', 'YeS');
    expect(spy).toHaveBeenLastCalledWith('user1', 'sub1', 'doc1', true);
  });

  it('forwards forceOcr=false when query is missing or not truthy', async () => {
    const spy = jest.spyOn(
      mockService as unknown as { reprocess: (...args: unknown[]) => unknown },
      'reprocess',
    );
    await controller.reprocess(req(), 'sub1', 'doc1');
    expect(spy).toHaveBeenLastCalledWith('user1', 'sub1', 'doc1', false);

    await controller.reprocess(req(), 'sub1', 'doc1', '0');
    expect(spy).toHaveBeenLastCalledWith('user1', 'sub1', 'doc1', false);

    await controller.reprocess(req(), 'sub1', 'doc1', 'no');
    expect(spy).toHaveBeenLastCalledWith('user1', 'sub1', 'doc1', false);
  });
});
