import os
import mimetypes
import psycopg2
from supabase import create_client

# --- CONFIG ---
OLD_PROJECT_ID = "szhoripztfaqkqneofbt"
NEW_PROJECT_ID = "igjfvofxervwifumejxh"
NEW_URL = f"https://{NEW_PROJECT_ID}.supabase.co"
NEW_KEY = """eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnamZ2b2Z4ZXJ2d2lmdW1lanhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjA4NTcsImV4cCI6MjA4NTAzNjg1N30.ZnwrqulLYO5p9V-n-zlGfLA6-zZ6yAcxDstPrTjlAbU""" # Anon key from env
DB_CONN = "postgresql://postgres.igjfvofxervwifumejxh:bATSuHcS7B5R-?P@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"

# Path local a la raiz del backup descomprimido
# Estructura observada: victoria-cake-main/szhoripztfaqkqneofbt.storage/szhoripztfaqkqneofbt/imagenes-productos/productos/...
BASE_DIR = r"c:\Users\kajar\Desktop\Trabajo\Hablilidades de programacion\victoria-cake-main\szhoripztfaqkqneofbt.storage\szhoripztfaqkqneofbt"

BUCKET_NAME = "imagenes-productos" # Segun carpeta listada

def main():
    print(f"🚀 Iniciando migración de Storage: {OLD_PROJECT_ID} -> {NEW_PROJECT_ID}")
    
    # 1. Conectar a Supabase Storage
    supabase = create_client(NEW_URL, NEW_KEY)
    
    # 2. Recorrer archivos locales
    storage_root = os.path.join(BASE_DIR, BUCKET_NAME)
    if not os.path.exists(storage_root):
        print(f"❌ Error: No existe ruta {storage_root}")
        return

    print(f"📂 Explorando {storage_root}...")
    
    # Asegurar que el bucket exista (intentar crearlo por si acaso, aunque anon quizas no pueda, esperamos que exista o sea publico)
    # Nota: Anon key usualmente no puede crear buckets. Asumimos que si restauramos backup, el bucket "imagenes-productos" deberia existir en DB pero quizas no en storage fisico.
    # Intentaremos subir.

    files_uploaded = 0
    for root, dirs, files in os.walk(storage_root):
        for file in files:
            file_path = os.path.join(root, file)
            # Calcular ruta relativa para usar como Key en storage
            # Ejemplo: .../imagenes-productos/productos/foto.jpg -> productos/foto.jpg
            relative_path = os.path.relpath(file_path, storage_root).replace("\\", "/")
            
            mime_type = mimetypes.guess_type(file_path)[0]
            
            print(f"➡️ Subiendo: {relative_path} ...", end="")
            
            try:
                with open(file_path, 'rb') as f:
                    # Upload (upsert=True para sobrescribir si existe)
                    # Bucket: imagenes-productos, Path: relative_path
                    res = supabase.storage.from_(BUCKET_NAME).upload(
                        path=relative_path,
                        file=f,
                        file_options={"content-type": mime_type, "upsert": "true"}
                    )
                    print("✅ OK")
                    files_uploaded += 1
            except Exception as e:
                print(f"❌ Error: {e}")

    print(f"\n📦 Total archivos subidos: {files_uploaded}")

    # 3. Actualizar Base de Datos
    print("\n🔄 Actualizando referencias en Base de Datos...")
    try:
        conn = psycopg2.connect(DB_CONN)
        cur = conn.cursor()
        
        # SQL Replacer
        # Reemplazar dominio viejo por nuevo en columnas de imagen
        sql = f"""
        UPDATE productos
        SET imagen = REPLACE(imagen, '{OLD_PROJECT_ID}', '{NEW_PROJECT_ID}')
        WHERE imagen LIKE '%{OLD_PROJECT_ID}%';
        """
        
        cur.execute(sql)
        updated_rows = cur.rowcount
        conn.commit()
        
        # Tambien actualizar el path si cambio algo mas, pero usualmente Supabase mantiene estructura /storage/v1/object/public/...
        
        print(f"✅ Base de datos actualizada. Filas modificadas: {updated_rows}")
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error DB: {e}")

if __name__ == "__main__":
    main()
