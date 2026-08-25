-- ============================================================================
-- CARGA DEL PADRÓN DE FLOTA — US EL ROBLE
--
-- >>> TRANSCRITO DESDE UNA IMAGEN. REQUIERE VERIFICACIÓN ANTES DE CONFIAR. <<<
--
-- La lista llegó como captura de pantalla de baja resolución. Las patentes son
-- cadenas de caracteres sin redundancia: un 3 leído como 8 no se delata solo.
-- Por eso al final de este archivo hay consultas de verificación que cruzan
-- este padrón contra el historial real de solicitudes; cualquier error de
-- transcripción aparece ahí como una lista corta y revisable.
--
-- Orden de ejecución:
--   1. supabase/migrations/20260825000000_flota_y_control_disco.sql
--   2. este archivo
--   3. las consultas de verificación del final  <-- NO SALTARSE
--
-- Convención de la planilla original:
--   filas ROJAS/ROSADAS = bus SIN disco duro  -> tiene_disco = false
--   filas verdes y blancas = con disco        -> tiene_disco = true
--
-- ----------------------------------------------------------------------------
-- CONFLICTOS DETECTADOS EN LA TRANSCRIPCIÓN — RESOLVER ANTES DE EJECUTAR
--
--   [1] PFYC65 aparece dos veces: interno 1753 e interno 1912.
--       Una de las dos patentes está mal leída. Tal como está, el
--       `on conflict (ppu) do update` conserva solo la última (1912) y el bus
--       1753 queda FUERA del padrón — sus casos se bloquearían.
--
--   [2] El interno 1705 aparece dos veces: PFTW57 y PFTW46.
--       Uno de los dos internos está mal leído (¿1703? ¿1706?). No rompe la
--       carga, pero indica que en esa zona de la planilla mi lectura falló.
--
-- Total transcrito: 187 filas (186 patentes únicas por el duplicado [1]).
-- ----------------------------------------------------------------------------
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Padrón: todas las PPU con su número interno.
--    Se cargan con tiene_disco = true; los sin disco se marcan en el paso 2.
-- ---------------------------------------------------------------------------
insert into flota (ppu, interno, terminal) values
  ('SHXD75', '1455', 'US El Roble'),
  ('SHXD77', '1456', 'US El Roble'),
  ('SHXD95', '1457', 'US El Roble'),
  ('SHXF13', '1460', 'US El Roble'),
  ('SHXF14', '1461', 'US El Roble'),
  ('SHXF29', '1462', 'US El Roble'),
  ('SHXF31', '1463', 'US El Roble'),
  ('SHXF84', '1465', 'US El Roble'),
  ('SHXF85', '1466', 'US El Roble'),
  ('SHXF87', '1467', 'US El Roble'),
  ('SHXF88', '1468', 'US El Roble'),
  ('SHXF90', '1469', 'US El Roble'),
  ('SHXF92', '1470', 'US El Roble'),
  ('SHXF93', '1471', 'US El Roble'),
  ('SHXF95', '1473', 'US El Roble'),
  ('SJPB21', '1606', 'US El Roble'),
  ('SJPB25', '1610', 'US El Roble'),
  ('SJPD71', '1655', 'US El Roble'),
  ('SJPD72', '1656', 'US El Roble'),
  ('SJPD73', '1657', 'US El Roble'),
  ('SJPF43', '1667', 'US El Roble'),
  ('SJPG44', '1668', 'US El Roble'),
  ('SKPH70', '1683', 'US El Roble'),
  ('SKPH73', '1684', 'US El Roble'),
  ('LXWP66', '1691', 'US El Roble'),
  ('LXWP74', '1692', 'US El Roble'),
  ('LXWP77', '1695', 'US El Roble'),
  ('LXWP81', '1696', 'US El Roble'),
  ('LXWP85', '1697', 'US El Roble'),
  ('LXWP86', '1698', 'US El Roble'),
  ('PFTV77', '1699', 'US El Roble'),
  ('PFTW35', '1700', 'US El Roble'),
  ('PFTW57', '1705', 'US El Roble'),   -- CONFLICTO [2]: interno 1705 repetido
  ('PFTW60', '1706', 'US El Roble'),
  ('PFVG78', '1707', 'US El Roble'),
  ('PFVG97', '1715', 'US El Roble'),
  ('PFVG98', '1716', 'US El Roble'),
  ('PFVG99', '1717', 'US El Roble'),
  ('PFVH12', '1718', 'US El Roble'),
  ('PFVH13', '1719', 'US El Roble'),
  ('PFVH15', '1720', 'US El Roble'),
  ('PFYC13', '1721', 'US El Roble'),
  ('PFYC14', '1722', 'US El Roble'),
  ('PFYC15', '1723', 'US El Roble'),
  ('PFYC17', '1724', 'US El Roble'),
  ('PFYC19', '1725', 'US El Roble'),
  ('PFYC20', '1726', 'US El Roble'),
  ('PFYC24', '1727', 'US El Roble'),
  ('PFYC26', '1728', 'US El Roble'),
  ('PFYC27', '1729', 'US El Roble'),
  ('PFYC28', '1730', 'US El Roble'),
  ('PFYC29', '1731', 'US El Roble'),
  ('PFYC31', '1732', 'US El Roble'),
  ('PFYC32', '1733', 'US El Roble'),
  ('PFYC33', '1734', 'US El Roble'),
  ('PFYC35', '1736', 'US El Roble'),
  ('PFYC36', '1737', 'US El Roble'),
  ('PFYC37', '1738', 'US El Roble'),
  ('PFYC43', '1739', 'US El Roble'),
  ('PFYC44', '1740', 'US El Roble'),
  ('PFYC46', '1741', 'US El Roble'),
  ('PFYC47', '1742', 'US El Roble'),
  ('PFYC48', '1743', 'US El Roble'),
  ('PFYC53', '1744', 'US El Roble'),
  ('PFYC55', '1745', 'US El Roble'),
  ('PFYC58', '1746', 'US El Roble'),
  ('PFYC60', '1748', 'US El Roble'),
  ('PFYC64', '1752', 'US El Roble'),
  ('PFYC65', '1753', 'US El Roble'),   -- CONFLICTO [1]: repetida con interno 1912
  ('PFYC68', '1754', 'US El Roble'),
  ('PFYC69', '1755', 'US El Roble'),
  ('PFYC70', '1756', 'US El Roble'),
  ('PFYC72', '1757', 'US El Roble'),
  ('PFYC81', '1759', 'US El Roble'),
  ('PFYC85', '1761', 'US El Roble'),
  ('PFZX83', '1762', 'US El Roble'),
  ('PGBY83', '1774', 'US El Roble'),
  ('PGRP67', '1782', 'US El Roble'),
  ('PGWT98', '1791', 'US El Roble'),
  ('SKPD28', '1832', 'US El Roble'),
  ('SKPK31', '1834', 'US El Roble'),
  ('SKPK32', '1835', 'US El Roble'),
  ('SKPK34', '1837', 'US El Roble'),
  ('SKPK35', '1838', 'US El Roble'),
  ('SKPK37', '1839', 'US El Roble'),
  ('SKPK39', '1840', 'US El Roble'),
  ('SKPK60', '1841', 'US El Roble'),
  ('SKPK42', '1843', 'US El Roble'),
  ('SKPK44', '1844', 'US El Roble'),
  ('SKPK65', '1845', 'US El Roble'),
  ('SKPK62', '1846', 'US El Roble'),
  ('SKPK63', '1847', 'US El Roble'),
  ('SKPL28', '1848', 'US El Roble'),
  ('SKPL30', '1849', 'US El Roble'),
  ('SKPL33', '1850', 'US El Roble'),
  ('SKPL34', '1851', 'US El Roble'),
  ('SKPL36', '1852', 'US El Roble'),
  ('LXWP67', '1854', 'US El Roble'),
  ('LXWP68', '1855', 'US El Roble'),
  ('LXWP69', '1856', 'US El Roble'),
  ('LXWP70', '1857', 'US El Roble'),
  ('LXWP71', '1858', 'US El Roble'),
  ('LXWP72', '1859', 'US El Roble'),
  ('LXWP73', '1860', 'US El Roble'),
  ('LXWP75', '1862', 'US El Roble'),
  ('LXWP78', '1863', 'US El Roble'),
  ('LXWP79', '1864', 'US El Roble'),
  ('LXWP80', '1865', 'US El Roble'),
  ('LXWP82', '1866', 'US El Roble'),
  ('LXWP83', '1867', 'US El Roble'),
  ('PFTW28', '1868', 'US El Roble'),
  ('PFTW29', '1869', 'US El Roble'),
  ('PFTW30', '1870', 'US El Roble'),
  ('PFTW34', '1871', 'US El Roble'),
  ('PFTW45', '1875', 'US El Roble'),
  ('PFTW47', '1876', 'US El Roble'),
  ('PFTW56', '1877', 'US El Roble'),
  ('PFTW58', '1878', 'US El Roble'),
  ('PFTW59', '1879', 'US El Roble'),
  ('PFVG75', '1881', 'US El Roble'),
  ('PFVH10', '1882', 'US El Roble'),
  ('PFVH11', '1883', 'US El Roble'),
  ('PFVH33', '1884', 'US El Roble'),
  ('LXWP60', '1885', 'US El Roble'),
  ('LXWP64', '1886', 'US El Roble'),
  ('PFTW61', '1888', 'US El Roble'),
  ('PFTW49', '1889', 'US El Roble'),
  ('PFTW20', '1890', 'US El Roble'),
  ('PFTW39', '1893', 'US El Roble'),
  ('PFTW41', '1895', 'US El Roble'),
  ('PFTW42', '1896', 'US El Roble'),
  ('PFTW48', '1897', 'US El Roble'),
  ('PFTW82', '1901', 'US El Roble'),
  ('PFVG64', '1903', 'US El Roble'),
  ('PFVG09', '1904', 'US El Roble'),
  ('PFVG77', '1905', 'US El Roble'),
  ('PFVG90', '1906', 'US El Roble'),
  ('PFVG92', '1907', 'US El Roble'),
  ('PFVG89', '1909', 'US El Roble'),
  ('PFVG95', '1910', 'US El Roble'),
  ('PFVG96', '1911', 'US El Roble'),
  ('PFYC65', '1912', 'US El Roble'),   -- CONFLICTO [1]: repetida con interno 1753
  ('PFYC77', '1913', 'US El Roble'),
  ('PFTW38', '1914', 'US El Roble'),
  ('PFYC90', '1915', 'US El Roble'),
  ('PGBY67', '1916', 'US El Roble'),
  ('PGLD67', '1917', 'US El Roble'),
  ('PGRZ67', '1918', 'US El Roble'),
  ('LXWP57', '1919', 'US El Roble'),
  ('LXWN86', '1920', 'US El Roble'),
  ('PGXK61', '1921', 'US El Roble'),
  ('PFYC66', '1922', 'US El Roble'),
  ('PFYC75', '1923', 'US El Roble'),
  ('PGTT95', '1925', 'US El Roble'),
  ('PGTV12', '1926', 'US El Roble'),
  ('PGBF59', '1928', 'US El Roble'),
  ('PGBY72', '1929', 'US El Roble'),
  ('PGBT33', '1930', 'US El Roble'),
  ('LXWP58', '1931', 'US El Roble'),
  ('SHCV78', '911',  'US El Roble'),
  ('SHCV32', '912',  'US El Roble'),
  ('SHCX39', '922',  'US El Roble'),
  ('SHCY22', '936',  'US El Roble'),
  ('SHCY28', '942',  'US El Roble'),
  ('SIPD41', '1646', 'US El Roble'),
  ('SJPD42', '1647', 'US El Roble'),
  ('SJPD43', '1648', 'US El Roble'),
  ('SJPD45', '1649', 'US El Roble'),
  ('PFTW32', '1701', 'US El Roble'),
  ('PFTW36', '1702', 'US El Roble'),
  ('PFTW37', '1704', 'US El Roble'),
  ('PFTW46', '1705', 'US El Roble'),   -- CONFLICTO [2]: interno 1705 repetido
  ('PFVG80', '1708', 'US El Roble'),
  ('PFVG82', '1709', 'US El Roble'),
  ('PFVG83', '1710', 'US El Roble'),
  ('PFVG84', '1711', 'US El Roble'),
  ('PFVG61', '1712', 'US El Roble'),
  ('PFVG87', '1713', 'US El Roble'),
  ('PFVG88', '1714', 'US El Roble'),
  ('SKPJ90', '1822', 'US El Roble'),
  ('SKPJ98', '1823', 'US El Roble'),
  ('SKPK20', '1825', 'US El Roble'),
  ('SKPK21', '1826', 'US El Roble'),
  ('SKPK22', '1827', 'US El Roble'),
  ('SKPK23', '1828', 'US El Roble'),
  ('SKPK26', '1830', 'US El Roble'),
  ('SKPK27', '1831', 'US El Roble')
on conflict (ppu) do update set
  interno    = excluded.interno,
  terminal   = excluded.terminal,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. Buses SIN disco duro (filas rojas de la planilla).
--
--    ESTE ES EL PASO QUE ACTIVA EL AVISO "BUS NO TIENE DISCO PARA SU REVISION".
--    Completa la lista con TODAS las patentes marcadas en rojo; abajo va la
--    única que pude distinguir con certeza en la captura.
-- ---------------------------------------------------------------------------
update flota
   set tiene_disco = false,
       notas       = coalesce(notas, 'Sin disco duro instalado'),
       updated_at  = now()
 where ppu in (
   'LXWP77'    -- interno 1695
   -- ,'XXXXXX' -- agregar aquí el resto de las filas rojas
 );

commit;

-- ============================================================================
-- 3. VERIFICACIÓN — ejecutar siempre después de cargar
-- ============================================================================

-- 3.1 Totales. Contrastar con el número de filas de la planilla.
select
  count(*)                                as total_flota,
  count(*) filter (where tiene_disco)     as con_disco,
  count(*) filter (where not tiene_disco) as sin_disco
from flota;

-- 3.2 Buses marcados sin disco. Debe coincidir con las filas rojas.
select ppu, interno, notas
  from flota
 where not tiene_disco
 order by interno;

-- 3.3 *** LA CONSULTA IMPORTANTE ***
--     PPUs que aparecen en solicitudes históricas pero NO están en el padrón.
--     Cada fila es una de dos cosas:
--       a) un bus realmente ajeno (correcto, el sistema lo bloqueará), o
--       b) una patente que transcribí mal (corregir en `flota`).
--     Revisar esta lista completa antes de dar por buena la carga.
select s.ppu,
       count(*)        as solicitudes,
       max(s.created_at) as ultima
  from solicitudes s
  left join flota f on f.ppu = s.ppu
 where s.ppu is not null
   and f.id is null
 group by s.ppu
 order by solicitudes desc, s.ppu;

-- 3.4 Internos duplicados: delatan un error de alineación al transcribir.
select interno, count(*), string_agg(ppu, ', ')
  from flota
 where interno is not null
 group by interno
having count(*) > 1
 order by interno;
