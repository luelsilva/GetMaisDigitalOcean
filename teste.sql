-- SQL para testar o JOIN de e-mail da empresa diretamente no Supabase
SELECT 
    i.id as internship_id,
    i.student_name,
    i.company_id,
    i.user_id,
    p.email as company_email,
    p.full_name as profile_name,
    p.roles as profile_role
FROM internships i
LEFT JOIN profiles p ON p.id = COALESCE(i.company_id, i.user_id)
WHERE i.id = 'e421833b-f38e-4f58-9956-f535e569ad7a';
