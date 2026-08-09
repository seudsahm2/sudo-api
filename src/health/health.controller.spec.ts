import { HealthController } from './health.controller';

describe('HealthController', () => {
  const controller = new HealthController();

  it('returns ok health payload', () => {
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });
});
