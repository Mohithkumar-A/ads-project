import { describe, expect, it } from 'vitest';
import { sampleLogs, rangeRecords, searchRecords, priorityScore, severityWeights, topEvents, mockApi, parseLogs, initialLogText } from './mock-api';
describe('mock investigation rules',()=>{
 it('retrieves the inclusive timestamp range without scanning UI state',()=>{const result=rangeRecords(sampleLogs,'14:32:03','14:32:15');expect(result.map(l=>l.id)).toEqual([3,4,5,6,7]);});
 it('matches database keywords in log services and messages',()=>{expect(searchRecords(sampleLogs,'database').map(l=>l.id)).toEqual([3,4,5,6,7,8,10]);});
 it('uses explicit severity weights',()=>{expect(severityWeights).toEqual({CRITICAL:10,ERROR:7,WARNING:4,INFO:1});});
 it('adds frequency and recency to severity weight',()=>{expect(priorityScore(sampleLogs[6])).toBe(24);});
 it('updates Top K from five to ten and keeps the maximum first',()=>{expect(topEvents(sampleLogs,5)).toHaveLength(5);expect(topEvents(sampleLogs,10)).toHaveLength(10);expect(topEvents(sampleLogs,10)[0].id).toBe(7);});
 it('parses the supplied seven-line dataset',()=>{expect(parseLogs(initialLogText)).toHaveLength(7);});
 it('selects authentication evidence rather than database findings',async()=>{const r=await mockApi.investigate(sampleLogs,'What caused authentication failures?');expect(r.evidence.map(l=>l.id)).toEqual([9]);expect(r.summary).toBe('Authentication failures detected on AUTH-01');});
});
