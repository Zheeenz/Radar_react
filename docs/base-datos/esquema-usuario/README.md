# Esquema entidad–relación del SQL proporcionado

El esquema representa las 12 tablas y las 12 claves foráneas del SQL compartido por el usuario. Se conserva la estructura, los nombres y las relaciones. El campo `plan_id` se incluye en Usuarios, según la instrucción `ALTER TABLE` final.

Esta documentación es una representación del diseño para revisarlo y presentarlo. No ejecuta una migración sobre la aplicación ni reemplaza otros borradores de base de datos.

## Archivos

- `esquema.png`: imagen del diagrama.
- `esquema.svg`: versión vectorial para ampliar e imprimir.
- `esquema.mmd`: fuente editable con Mermaid.
- `esquema.sql`: SQL proporcionado, con formato uniforme y sin cambios de estructura.
- `mermaid-config.json`: configuración visual del diagrama.
- `validacion.json`: comprobación de las 12 tablas y las 12 relaciones en PostgreSQL integrado en memoria, sin aplicar cambios a la aplicación.

## Lectura del diagrama

`PK` identifica una clave primaria, `FK` una clave foránea y `UK` un campo con restricción de unicidad. Todos los identificadores primarios se generan automáticamente mediante `GENERATED ALWAYS AS IDENTITY`.

La relación muestra cero o un registro padre y cero o muchos registros hijos. Esto refleja que las columnas con `REFERENCES` de tu SQL no tienen `NOT NULL`: admiten valores nulos. Las líneas son discontinuas porque las claves foráneas no forman parte de las claves primarias de las tablas hijas.

En la imagen se usa `timestamptz`, equivalente a `timestamp with time zone`. Los campos `numeric` conservan la precisión `NUMERIC(10,2)` en el SQL. La restricción de `nivel_preferencia` admite valores entre 1 y 5; la columna también admite `NULL` porque no está declarada como obligatoria.

## Relaciones

| Tabla padre | Tabla hija | Clave foránea |
| --- | --- | --- |
| planes | usuarios | plan_id |
| comercios | productos | comercio_id |
| productos | inventarios | producto_id |
| recetas | ingrediente_recetas | receta_id |
| productos | ingrediente_recetas | producto_id |
| usuarios | carritos | usuario_id |
| carritos | detalle_carritos | carrito_id |
| productos | detalle_carritos | producto_id |
| usuarios | favoritos | usuario_id |
| productos | favoritos | producto_id |
| usuarios | notificaciones | usuario_id |
| usuarios | preferencia_usuario | usuario_id |

## Puntos para revisar posteriormente

El diagrama conserva Favoritos asociados a productos, tal como aparece en el SQL. La aplicación actual guarda comercios favoritos; esa diferencia deberá resolverse cuando se conecte la base.

El producto pertenece a un comercio y su precio está en Productos. Si se quiere representar un mismo producto global en varios comercios, habrá que revisar esa relación con Inventarios antes de implementar el comparador.

Preferencia_usuario almacena el tipo de comida como texto en cada registro. No se agregó un catálogo de preferencias porque no está presente en este SQL.

Para implementar cuentas, el campo de contraseña deberá almacenar un hash generado por el servidor; no contraseñas en texto plano.

Referencia de la notación: [diagramas entidad–relación de Mermaid](https://mermaid.js.org/syntax/entityRelationshipDiagram.html).
