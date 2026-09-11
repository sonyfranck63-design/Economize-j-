sed -i 's/deleteBusiness = (businessId: string) => {/deleteBusiness = async (businessId: string) => {/g' src/context/AppContext.tsx

sed -i 's/setBusinesses((prev) => prev.filter((b) => b.id !== businessId));/    setBusinesses((prev) => prev.filter((b) => b.id !== businessId));\n    if (isSupabaseConfigured) {\n      try {\n        await supabase.from('"'"'businesses'"'"').delete().eq('"'"'id'"'"', businessId);\n      } catch (err) {\n        console.error('"'"'Erro ao excluir empresa do Supabase:'"'"', err);\n      }\n    }/g' src/context/AppContext.tsx
