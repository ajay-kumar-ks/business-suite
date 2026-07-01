import psycopg2

conn = psycopg2.connect('postgresql://postgres.ykumusptahqbjoroocmj:ajayadishnabeelabhijith@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require')
cur = conn.cursor()
cur.execute('SELECT COUNT(*) FROM search_documents')
print('search_documents_total', cur.fetchone()[0])
cur.execute("SELECT entity_type, COUNT(*) FROM search_documents GROUP BY entity_type ORDER BY entity_type")
print(cur.fetchall())
cur.close()
conn.close()
