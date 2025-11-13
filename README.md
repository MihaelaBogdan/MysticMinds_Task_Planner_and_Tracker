# MysticMinds_Task_Planner_and_Tracker

Scopul proiectului este realizarea unei aplicații web care să permită planificarea, alocarea și monitorizarea activităților (task-urilor) desfășurate într-o echipă.
Aplicația oferă un spațiu centralizat pentru colaborare, urmărirea progresului și vizualizarea istoricului sarcinilor, optimizând comunicarea între administratori, manageri și executanți.
Aplicația este concepută sub forma unei Single Page Application (SPA), disponibilă în browser.

 Functionalitati: 
1. Gestionare utilizatori: Aplicația are o serie de utilizatori, dintre care unii sunt marcați ca manageri, iar ceilalți ca executanți.
2. Functie Administrator: Aplicația are un administrator, care poate adăuga utilizatori și le poate seta rolul (manager sau executant). Administratorul are acces complet la gestionarea conturilor.
3. Alocare manager pentru executant: Un utilizator care nu este manager are obligatoriu un manager alocat, pentru a putea primi task-uri.
4. Creare task: Un manager poate crea un task, oferind o descriere suficient de detaliată pentru ca executantul să poată realiza sarcina. La creare, task-ul are starea OPEN.
5.Alocare task: Managerul poate aloca un task unui utilizator (executant). În acest moment, starea task-ului devine PENDING.
6. Executare task: Un executant poate consulta lista de task-uri care i-au fost alocate și le poate marca drept finalizate, aducându-le în starea COMPLETED.
7. Monitorizare progres: Un manager poate vedea lista tuturor task-urilor create de el, împreună cu status-urile curente (OPEN, PENDING, COMPLETED, CLOSED).
8. Închidere task: Un manager poate marca un task aflat în starea COMPLETED ca fiind CLOSED, confirmând finalizarea completă a acestuia.
9. Istoric utilizator: Un utilizator (manager sau executant) poate consulta lista sa istorică de task-uri finalizate sau închise.
10. Istoric manager – executant: Un manager poate consulta lista istorică de task-uri pentru fiecare executant din subordine.

Functionalitati optionale:
1.Camp de prioritate pentru taskuri(LOW, MEDIUM, HIGH, URGENT)
2.Deadline si estimare de timp, camp dueDate si estimatedHours


Arhitectura Aplicației: Sistemul este structurat pe trei componente majore, care comunică asincron:

1. Frontend (Client): React.js

2. REST API (Server): Node.js + Express

3. Bază de Date: MySQL
   

Frontend (React.js)
Interfața cu utilizatorul este o aplicație de tip Single Page Application (SPA) construită folosind React 18+.
Dependențe Cheie:
React Router DOM: Gestionează navigarea și rutarea în cadrul SPA.
Axios: Client HTTP utilizat pentru comunicarea cu REST API-ul.
Redux Toolkit: Soluția standard pentru gestionarea stării globale a aplicației.
React Hook Form: Asigură gestionarea eficientă și validarea formularelor.
Bootstrap / Material UI: Furnizează componente UI și asigură un design responsive.

Backend (Node.js + Express.js)
Backend-ul implementează logica de business și expune REST API-ul.
Stiva Tehnologică
Framework: Express.js.
ORM: Sequelize (pentru MySQL).
Autentificare: JWT (JSON Web Token) pentru securizarea rutelor.
Validare: express-validator pentru validarea datelor la nivelul API-ului.

Model de date - Tabele: users, tasks

Flux de lucru(workflow): 
1. Administratorul adaugă utilizatori și stabilește rolurile.
2. Managerul creează un task → starea OPEN.
3. Managerul alocă un task unui executant → starea PENDING
4. Executantul finalizează task-ul → starea COMPLETED.
5. Managerul verifică și închide task-ul → starea CLOSED.
6. Utilizatorii pot consulta istoricul task-urilor proprii.
7. Managerul poate consulta istoricul task-urilor fiecărui executant.




 




