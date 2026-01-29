from supabase import create_client

NEW_PROJECT_ID = "igjfvofxervwifumejxh"
NEW_URL = f"https://{NEW_PROJECT_ID}.supabase.co"
NEW_KEY = """eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnamZ2b2Z4ZXJ2d2lmdW1lanhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjA4NTcsImV4cCI6MjA4NTAzNjg1N30.ZnwrqulLYO5p9V-n-zlGfLA6-zZ6yAcxDstPrTjlAbU""" # Anon key

BUCKET = "imagenes-productos"

def main():
    sp = create_client(NEW_URL, NEW_KEY)
    print(f"Listando archivos en bucket '{BUCKET}'...")
    try:
        # Listar carpeta raiz, o 'productos'
        res = sp.storage.from_(BUCKET).list("productos")
        print(f"Encontrados {len(res)} archivos en 'productos'.")
        if res:
            print("Ejemplo:", res[0])
        else:
            print("Carpeta vacia o error de permisos.")
            
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
