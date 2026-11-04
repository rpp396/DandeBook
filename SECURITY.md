# Seguridad y privacidad

Pautado es una app web estática (HTML, CSS y JavaScript sin servidor ni dependencias).

## Qué datos guarda la app

Todo se guarda **solo en el navegador de quien la usa**, en `localStorage`, con la clave `pautado-v1`: las páginas del cuaderno (título, compás, tempo, tono, acordes y melodía), los ajustes y la lista de páginas borradas. No hay cuentas propias, servidor, analítica ni cookies, y la app no envía nada a ningún sitio. Para borrarlo todo basta con borrar los datos del sitio en el navegador.

Al abrir la app como Artifact de claude.ai, las páginas se guardan además en la cuenta de Claude de quien la usa, en su parte privada del almacenamiento que ofrece claude.ai (`window.claude`), no en ningún servicio de este proyecto.

Las tipografías van incluidas en el repositorio (`fonts/`, licencia SIL OFL): al abrir la página no se contacta con ningún tercero, y el `Referer` no se envía (`no-referrer`).

## Medidas de la app

- **Los datos guardados no se consideran de fiar.** Al leer `localStorage`, el almacenamiento de claude.ai o un texto importado se valida todo: tipos, rangos, claves de listas cerradas, compases y tonos existentes, y un máximo de páginas, acordes y notas. Lo corrupto se descarta o vuelve al valor por defecto, y la app arranca igualmente.
- **Todo dato que se pinta se escapa** (`esc()` o `textContent`).
- **Content-Security-Policy** (por `<meta>`): solo se ejecutan los scripts de la propia página (`script-src 'self'`), sin código en línea ni `eval`, sin estilos en línea, sin conexiones a otros orígenes, sin `<base>`, formularios ni objetos.
- Pruebas automáticas (`tests/seguridad.test.mjs`) con datos maliciosos y corruptos e importaciones hostiles; todas las suites comprueban que no hay violaciones de la política ni peticiones externas.

## Limitaciones

- **Con GitHub Pages no hay cabeceras HTTP propias:** la política va en un `<meta>`, que no admite `frame-ancestors`, `report-uri` ni `sandbox`.
- **Origen compartido.** En `usuario.github.io` todos los proyectos de la misma cuenta comparten el mismo `localStorage` (por ejemplo, este y DandEtudeDuR). Usan claves distintas y cada app valida lo que lee, pero un script malicioso de otro proyecto del mismo dominio podría leer o cambiar estas páginas.
- **Sin copia de seguridad fuera de claude.ai.** Los datos viven solo en ese navegador; *Copiar la página como texto* sirve para guardarlas aparte.

## Cómo avisar de un problema

Si encuentras una vulnerabilidad o un fallo que ponga en riesgo los datos de alguien, **no abras un issue público**: usa *Security → Report a vulnerability* en la página del repositorio (aviso privado de GitHub), con los pasos para reproducirlo y el navegador.
