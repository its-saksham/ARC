import { describe, expect, it } from 'vitest';
import { level, rank, radarScore, localDate, streak } from './progression';
describe('progression',()=>{
 it('levels every 200 XP',()=>{expect([0,199,200,399,400].map(level)).toEqual([1,1,2,2,3]);});
 it('uses exact rank boundaries',()=>{expect([0,1499,1500,4499,4500,9000,18000,36000].map(rank)).toEqual(['E','E','D','D','C','B','A','S']);});
 it('scales radar and caps at 100',()=>{expect([0,1,16,1024,100000].map(radarScore)).toEqual([20,22,30,100,100]);});
 it('uses saved timezone across midnight and DST',()=>{expect(localDate(new Date('2026-01-01T20:00:00Z'),'Asia/Kolkata')).toBe('2026-01-02');expect(localDate(new Date('2026-03-08T07:00:00Z'),'America/New_York')).toBe('2026-03-08');expect(localDate(new Date('2026-01-01T00:30:00Z'),'America/Los_Angeles')).toBe('2025-12-31');});
 it('keeps yesterday alive, counts distinct dates, resets gaps',()=>{expect(streak(['2026-09-29','2026-09-30','2026-09-30'],'2026-10-01')).toBe(2);expect(streak(['2026-09-29'],'2026-10-01')).toBe(0);expect(streak(['2026-09-30','2026-10-01'],'2026-10-01')).toBe(2);expect(streak(['2025-12-31','2026-01-01'],'2026-01-01')).toBe(2);});
});
