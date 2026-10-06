-- AddForeignKey
ALTER TABLE "comprobante" ADD CONSTRAINT "comprobante_recibido_por_fkey" FOREIGN KEY ("recibido_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante" ADD CONSTRAINT "comprobante_verificado_por_fkey" FOREIGN KEY ("verificado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobante_movimiento" ADD CONSTRAINT "comprobante_movimiento_vinculado_por_fkey" FOREIGN KEY ("vinculado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

