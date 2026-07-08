import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Document, Types } from 'mongoose';

function transform(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (value instanceof Types.ObjectId) return value.toString();
  if (Buffer.isBuffer(value)) return value;

  // Mongoose Documents/subdocuments carry internal bookkeeping fields alongside
  // schema data — plain Object.entries() would leak those, so convert first.
  if (value instanceof Document) {
    return transform(value.toObject({ virtuals: false }), seen);
  }

  if (Array.isArray(value)) return value.map((item) => transform(item, seen));

  if (typeof value === 'object') {
    if (seen.has(value)) return value;
    seen.add(value);

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === '__v') continue;
      if (key === '_id') {
        result.id = transform(val, seen);
        continue;
      }
      result[key] = transform(val, seen);
    }
    return result;
  }

  return value;
}

@Injectable()
export class TransformMongoInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((data: unknown) => transform(data)));
  }
}
