import { describe, expect, it } from 'vitest';
import { analyticsBeforeSend, contactEvent } from './contactTracking';

describe('contactEvent', () => {
  it('reconoce los enlaces de contacto que generan las webs', () => {
    expect(contactEvent('https://wa.me/34656597542?text=Hola')).toBe('whatsapp');
    expect(contactEvent('tel:+34931513600')).toBe('telefono');
    expect(contactEvent('mailto:info@example.com')).toBe('email');
    expect(contactEvent('https://www.google.com/maps/dir/?api=1&destination=x')).toBe('como_llegar');
    expect(contactEvent('https://www.google.com/maps/search/?api=1&query=x')).toBe('como_llegar');
    expect(contactEvent('https://maps.app.goo.gl/abc')).toBe('como_llegar');
  });

  it('ignora el resto de enlaces', () => {
    expect(contactEvent('/reparaciones')).toBeUndefined();
    expect(contactEvent('https://www.google.com/search?q=maps')).toBeUndefined();
    expect(contactEvent('https://example.com/wa.me/')).toBeUndefined();
  });
});

describe('analyticsBeforeSend', () => {
  const send = (url: string) => analyticsBeforeSend({ type: 'pageview', url })?.url;

  it('no envía nada del panel', () => {
    expect(send('https://www.dulceflorbcn.es/admin/pedidos/abc')).toBeUndefined();
    expect(send('https://www.dulceflorbcn.es/admin')).toBeUndefined();
  });

  it('quita el número de pedido y la consulta', () => {
    expect(send('https://www.dulceflorbcn.es/pedido/confirmacion/DF-123?x=1#top')).toBe('https://www.dulceflorbcn.es/pedido/confirmacion');
    expect(send('https://www.dulceflorbcn.es/carta?tel=600000000')).toBe('https://www.dulceflorbcn.es/carta');
  });
});
