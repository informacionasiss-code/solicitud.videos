-- ============================================================================
-- PADRÓN DE FLOTA — 215 buses
--
-- Lista entregada directamente por el usuario como texto. Sustituye por
-- completo a la versión anterior, que se había transcrito desde una captura de
-- pantalla y era incorrecta: de 186 patentes leídas, 26 no existían y faltaban
-- 55 buses reales, que en consecuencia quedaban marcados como ajenos.
--
-- Validación de esta lista: 1290 caracteres, 215 patentes de 6 caracteres
-- (4 letras + 2 dígitos), sin duplicados. Dos métodos independientes de
-- extracción -por patrón y por corte fijo- dieron el mismo resultado.
--
-- Requiere la migración:
--   supabase/migrations/20260825000000_padron_flota_y_control_disco.sql
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Padrón completo
--
-- El número interno se conserva sólo para las 160 patentes que coincidían con
-- la transcripción anterior: si la patente de esa fila se leyó bien, su interno
-- también. Las 55 restantes quedan sin interno hasta que se cargue. El interno
-- es informativo y no interviene en ninguna decisión, a diferencia de la PPU.
--
-- `tiene_disco` NO se toca al reinsertar: si un bus ya fue marcado sin disco
-- desde la aplicación, volver a ejecutar esta carga no debe deshacerlo.
-- ---------------------------------------------------------------------------
insert into padron_flota (ppu, interno) values
  ('SHXD75', '1455'),
  ('SHXD77', '1456'),
  ('SHXD79', null),
  ('SHXD85', null),
  ('SHXF13', '1460'),
  ('SHXF14', '1461'),
  ('SHXF29', '1462'),
  ('SHXF31', '1463'),
  ('SHXF84', '1465'),
  ('SHXF85', '1466'),
  ('SHXF87', '1467'),
  ('SHXF88', '1468'),
  ('SHXF90', '1469'),
  ('SHXF92', '1470'),
  ('SHXF93', '1471'),
  ('SHXF97', null),
  ('SHXG36', null),
  ('SHXG38', null),
  ('SJPB21', '1606'),
  ('SJPB25', '1610'),
  ('SJPC73', null),
  ('SJPC84', null),
  ('SJPD41', null),
  ('SJPD42', '1647'),
  ('SJPD43', '1648'),
  ('SJPD44', null),
  ('SJPD45', '1649'),
  ('SJPD71', '1655'),
  ('SJPD72', '1656'),
  ('SJPD97', null),
  ('SJPF43', '1667'),
  ('SJPF44', null),
  ('SKPH70', '1683'),
  ('SKPH73', '1684'),
  ('LXWP66', '1691'),
  ('LXWP76', null),
  ('LXWP77', '1695'),
  ('LXWP81', '1696'),
  ('LXWP85', '1697'),
  ('LXWP86', '1698'),
  ('PFTV77', '1699'),
  ('PFTW25', null),
  ('PFTW32', '1701'),
  ('PFTW36', '1702'),
  ('PFTW40', null),
  ('PFTW46', '1705'),
  ('PFTW57', '1705'),
  ('PFTW60', '1706'),
  ('PFVG78', '1707'),
  ('PFVG80', '1708'),
  ('PFVG82', '1709'),
  ('PFVG83', '1710'),
  ('PFVG85', null),
  ('PFVG86', null),
  ('PFVG87', '1713'),
  ('PFVG88', '1714'),
  ('PFVG97', '1715'),
  ('PFVG98', '1716'),
  ('PFVG99', '1717'),
  ('PFVH12', '1718'),
  ('PFVH13', '1719'),
  ('PFVH15', '1720'),
  ('PFYC13', '1721'),
  ('PFYC14', '1722'),
  ('PFYC16', null),
  ('PFYC17', '1724'),
  ('PFYC19', '1725'),
  ('PFYC20', '1726'),
  ('PFYC25', null),
  ('PFYC26', '1728'),
  ('PFYC27', '1729'),
  ('PFYC28', '1730'),
  ('PFYC29', '1731'),
  ('PFYC31', '1732'),
  ('PFYC32', '1733'),
  ('PFYC33', '1734'),
  ('PFYC34', null),
  ('PFYC35', '1736'),
  ('PFYC36', '1737'),
  ('PFYC37', '1738'),
  ('PFYC43', '1739'),
  ('PFYC44', '1740'),
  ('PFYC46', '1741'),
  ('PFYC49', null),
  ('PFYC50', null),
  ('PFYC53', '1744'),
  ('PFYC55', '1745'),
  ('PFYC58', '1746'),
  ('PFYC60', '1748'),
  ('PFYC61', null),
  ('PFYC64', '1752'),
  ('PFYC65', '1753'),
  ('PFYC68', '1754'),
  ('PFYC69', '1755'),
  ('PFYC70', '1756'),
  ('PFYC72', '1757'),
  ('PFYC79', null),
  ('PFYC81', '1759'),
  ('PFYC85', '1761'),
  ('PFZK83', null),
  ('PGBY83', '1774'),
  ('PGKP67', null),
  ('PGLD42', null),
  ('PGWT98', '1791'),
  ('SKPJ90', '1822'),
  ('SKPK18', null),
  ('SKPK19', null),
  ('SKPK20', '1825'),
  ('SKPK21', '1826'),
  ('SKPK22', '1827'),
  ('SKPK23', '1828'),
  ('SKPK25', null),
  ('SKPK26', '1830'),
  ('SKPK27', '1831'),
  ('SKPK28', null),
  ('SKPK31', '1834'),
  ('SKPK32', '1835'),
  ('SKPK34', '1837'),
  ('SKPK35', '1838'),
  ('SKPK37', '1839'),
  ('SKPK39', '1840'),
  ('SKPK40', null),
  ('SKPK42', '1843'),
  ('SKPK44', '1844'),
  ('SKPK45', null),
  ('SKPK62', '1846'),
  ('SKPK63', '1847'),
  ('SKPL28', '1848'),
  ('SKPL30', '1849'),
  ('SKPL33', '1850'),
  ('SKPL34', '1851'),
  ('SKPL36', '1852'),
  ('LXWP67', '1854'),
  ('LXWP68', '1855'),
  ('LXWP69', '1856'),
  ('LXWP70', '1857'),
  ('LXWP71', '1858'),
  ('LXWP72', '1859'),
  ('LXWP73', '1860'),
  ('LXWP74', '1692'),
  ('LXWP75', '1862'),
  ('LXWP78', '1863'),
  ('LXWP79', '1864'),
  ('LXWP80', '1865'),
  ('LXWP82', '1866'),
  ('LXWP83', '1867'),
  ('PFTW28', '1868'),
  ('PFTW29', '1869'),
  ('PFTW30', '1870'),
  ('PFTW31', null),
  ('PFTW34', '1871'),
  ('PFTW38', '1914'),
  ('PFTW44', null),
  ('PFTW45', '1875'),
  ('PFTW47', '1876'),
  ('PFTW49', '1889'),
  ('PFTW50', null),
  ('PFTW56', '1877'),
  ('PFTW58', '1878'),
  ('PFVG79', null),
  ('PFVH10', '1882'),
  ('PFVH11', '1883'),
  ('PFVH14', null),
  ('LXWP60', '1885'),
  ('LXWP64', '1886'),
  ('LXWP87', null),
  ('PFTW19', null),
  ('PFTW20', '1890'),
  ('PFTW26', null),
  ('PFTW35', '1700'),
  ('PFTW39', '1893'),
  ('PFTW41', '1895'),
  ('PFTW42', '1896'),
  ('PFTW48', '1897'),
  ('PFTW51', null),
  ('PFTW55', null),
  ('PFTW59', '1879'),
  ('PFTW61', '1888'),
  ('PFTW62', null),
  ('PFVG75', '1881'),
  ('PFVG76', null),
  ('PFVG77', '1905'),
  ('PFVG89', '1909'),
  ('PFVG90', '1906'),
  ('PFVG92', '1907'),
  ('PFVG94', null),
  ('PFVG95', '1910'),
  ('PFVG96', '1911'),
  ('PFYC57', null),
  ('PFYC77', '1913'),
  ('PFYC88', null),
  ('PFYC90', '1915'),
  ('PGBY67', '1916'),
  ('PGLD67', '1917'),
  ('PGRZ67', '1918'),
  ('LXWP57', '1919'),
  ('LXWP61', null),
  ('LXWP62', null),
  ('PFYC66', '1922'),
  ('PFYC75', '1923'),
  ('PFYC76', null),
  ('PGTT95', '1925'),
  ('PGTV12', '1926'),
  ('PFZK91', null),
  ('PGBF59', '1928'),
  ('PGBY72', '1929'),
  ('PGBY73', null),
  ('LXWP58', '1931'),
  ('LXWP59', null),
  ('PFYC80', null),
  ('SHCV78', '911'),
  ('SHCV83', null),
  ('SHCX39', '922'),
  ('SHCY22', '936'),
  ('SHCY28', '942')
on conflict (ppu) do update set
  interno    = coalesce(excluded.interno, padron_flota.interno),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. Eliminar los buses fantasma de la carga anterior
--
-- Son patentes mal leídas que no corresponden a ningún bus. Dejarlas es
-- peligroso: una patente inexistente en el padrón haría pasar por propio a
-- cualquier bus ajeno que coincidiera con ella.
-- ---------------------------------------------------------------------------
delete from padron_flota
 where ppu not in (
  'SHXD75', 'SHXD77', 'SHXD79', 'SHXD85', 'SHXF13', 'SHXF14', 'SHXF29', 'SHXF31',
  'SHXF84', 'SHXF85', 'SHXF87', 'SHXF88', 'SHXF90', 'SHXF92', 'SHXF93', 'SHXF97',
  'SHXG36', 'SHXG38', 'SJPB21', 'SJPB25', 'SJPC73', 'SJPC84', 'SJPD41', 'SJPD42',
  'SJPD43', 'SJPD44', 'SJPD45', 'SJPD71', 'SJPD72', 'SJPD97', 'SJPF43', 'SJPF44',
  'SKPH70', 'SKPH73', 'LXWP66', 'LXWP76', 'LXWP77', 'LXWP81', 'LXWP85', 'LXWP86',
  'PFTV77', 'PFTW25', 'PFTW32', 'PFTW36', 'PFTW40', 'PFTW46', 'PFTW57', 'PFTW60',
  'PFVG78', 'PFVG80', 'PFVG82', 'PFVG83', 'PFVG85', 'PFVG86', 'PFVG87', 'PFVG88',
  'PFVG97', 'PFVG98', 'PFVG99', 'PFVH12', 'PFVH13', 'PFVH15', 'PFYC13', 'PFYC14',
  'PFYC16', 'PFYC17', 'PFYC19', 'PFYC20', 'PFYC25', 'PFYC26', 'PFYC27', 'PFYC28',
  'PFYC29', 'PFYC31', 'PFYC32', 'PFYC33', 'PFYC34', 'PFYC35', 'PFYC36', 'PFYC37',
  'PFYC43', 'PFYC44', 'PFYC46', 'PFYC49', 'PFYC50', 'PFYC53', 'PFYC55', 'PFYC58',
  'PFYC60', 'PFYC61', 'PFYC64', 'PFYC65', 'PFYC68', 'PFYC69', 'PFYC70', 'PFYC72',
  'PFYC79', 'PFYC81', 'PFYC85', 'PFZK83', 'PGBY83', 'PGKP67', 'PGLD42', 'PGWT98',
  'SKPJ90', 'SKPK18', 'SKPK19', 'SKPK20', 'SKPK21', 'SKPK22', 'SKPK23', 'SKPK25',
  'SKPK26', 'SKPK27', 'SKPK28', 'SKPK31', 'SKPK32', 'SKPK34', 'SKPK35', 'SKPK37',
  'SKPK39', 'SKPK40', 'SKPK42', 'SKPK44', 'SKPK45', 'SKPK62', 'SKPK63', 'SKPL28',
  'SKPL30', 'SKPL33', 'SKPL34', 'SKPL36', 'LXWP67', 'LXWP68', 'LXWP69', 'LXWP70',
  'LXWP71', 'LXWP72', 'LXWP73', 'LXWP74', 'LXWP75', 'LXWP78', 'LXWP79', 'LXWP80',
  'LXWP82', 'LXWP83', 'PFTW28', 'PFTW29', 'PFTW30', 'PFTW31', 'PFTW34', 'PFTW38',
  'PFTW44', 'PFTW45', 'PFTW47', 'PFTW49', 'PFTW50', 'PFTW56', 'PFTW58', 'PFVG79',
  'PFVH10', 'PFVH11', 'PFVH14', 'LXWP60', 'LXWP64', 'LXWP87', 'PFTW19', 'PFTW20',
  'PFTW26', 'PFTW35', 'PFTW39', 'PFTW41', 'PFTW42', 'PFTW48', 'PFTW51', 'PFTW55',
  'PFTW59', 'PFTW61', 'PFTW62', 'PFVG75', 'PFVG76', 'PFVG77', 'PFVG89', 'PFVG90',
  'PFVG92', 'PFVG94', 'PFVG95', 'PFVG96', 'PFYC57', 'PFYC77', 'PFYC88', 'PFYC90',
  'PGBY67', 'PGLD67', 'PGRZ67', 'LXWP57', 'LXWP61', 'LXWP62', 'PFYC66', 'PFYC75',
  'PFYC76', 'PGTT95', 'PGTV12', 'PFZK91', 'PGBF59', 'PGBY72', 'PGBY73', 'LXWP58',
  'LXWP59', 'PFYC80', 'SHCV78', 'SHCV83', 'SHCX39', 'SHCY22', 'SHCY28'
 );

-- ---------------------------------------------------------------------------
-- 3. Buses SIN disco duro
--
-- Activa el aviso "BUS NO TIENE DISCO PARA SU REVISION" y el envío inmediato.
-- Abajo va la única fila que pude identificar con certeza en la planilla
-- original; hay que completar el resto.
-- ---------------------------------------------------------------------------
update padron_flota
   set tiene_disco = false,
       notas       = coalesce(notas, 'Sin disco duro instalado'),
       updated_at  = now()
 where ppu in (
   'LXWP77'
   -- ,'XXXXXX'  -- agregar aquí las demás patentes sin disco
 );

commit;

-- ============================================================================
-- 4. Verificación
-- ============================================================================

-- Debe dar exactamente 215.
select count(*) as total_padron from padron_flota;

-- Buses marcados sin disco.
select ppu, interno, notas from padron_flota where not tiene_disco order by ppu;

-- Cuántos buses quedaron sin número interno (los 55 que faltaban).
select count(*) as sin_interno from padron_flota where interno is null;

-- PPU del historial de solicitudes que siguen sin aparecer en el padrón.
-- Ahora deberían ser sólo buses realmente ajenos.
select s.ppu, count(*) as solicitudes
  from solicitudes s
  left join padron_flota f on f.ppu = s.ppu
 where s.ppu is not null and f.id is null
 group by s.ppu order by solicitudes desc;

-- Lo mismo para las impugnaciones ya cargadas. Tras ejecutar esto, usar el
-- botón "Recruzar con el padrón" en la pantalla de Impugnación para corregir
-- los lotes existentes sin volver a subir los archivos.
select i.ppu, i.ppu_original, count(*) as filas
  from impugnaciones i
  left join padron_flota f on f.ppu = i.ppu
 where f.id is null
 group by i.ppu, i.ppu_original order by filas desc;
