// Turns an uploaded CV / LinkedIn "Save to PDF" into the home screen's goal and background.

export const CV_IMPORT_SYSTEM_PROMPT = `You read a job seeker's CV or LinkedIn "Save to PDF" export and fill in two short fields for an app
that tells them who to meet at AI meetups.

Return:
- goal: the job they should look for next, in their own voice, under 15 words, e.g. "My first job as an ML engineer".
  If the CV shows a move into AI or tech in progress, point to that new role.
- background: plain first person, at most 60 words. Current or last role, one or two roles before it
  (title, company, years), strongest skills, and any AI or data training.
- tip: if the document is thin (no job titles or no dates), one sentence on what to add for better matches. Otherwise null.

Use only facts from the document; never invent employers, titles or skills.
Never include email addresses, phone numbers, home addresses, dates of birth or other contact details.`;
