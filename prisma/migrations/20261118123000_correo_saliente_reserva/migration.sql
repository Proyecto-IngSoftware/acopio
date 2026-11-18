ALTER TABLE correo_saliente ADD COLUMN reserva_id uuid;

CREATE INDEX correo_saliente_reserva_id_idx ON correo_saliente (reserva_id);

ALTER TABLE correo_saliente ADD CONSTRAINT correo_saliente_reserva_id_fkey
  FOREIGN KEY (reserva_id) REFERENCES reserva (id) ON DELETE CASCADE ON UPDATE CASCADE;
