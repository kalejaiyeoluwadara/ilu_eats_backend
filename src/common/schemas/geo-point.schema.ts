import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Embedded GeoJSON Point. Note the coordinate order is [longitude, latitude]
 * — GeoJSON order, not the lat,lng you say out loud. Parent schemas must add a
 * `2dsphere` index on the field for $geoNear / $near queries to work.
 */
@Schema({ _id: false })
export class GeoPoint {
  @Prop({ type: String, enum: ['Point'], default: 'Point', required: true })
  type: 'Point';

  /** [longitude, latitude] */
  @Prop({ type: [Number], required: true })
  coordinates: number[];
}

export const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);
