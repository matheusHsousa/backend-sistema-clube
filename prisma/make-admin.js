"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const firebaseUid = process.env.FIREBASE_UID;
    const email = process.env.FIREBASE_EMAIL;
    if (!firebaseUid && !email) {
        console.error('Use FIREBASE_UID or FIREBASE_EMAIL env var to identify the user to make admin.');
        process.exit(1);
    }
    const where = firebaseUid ? { firebaseUid } : { email };
    const user = await prisma.user.upsert({
        where: where,
        update: { roles: [client_1.Role.ADMIN] },
        create: {
            firebaseUid: firebaseUid || `seed-${Date.now()}`,
            email: email || `seed-${Date.now()}@example.com`,
            name: 'Admin (manual)',
            roles: [client_1.Role.ADMIN],
        },
    });
    console.log('Usuário atualizado/criado como ADMIN:', { id: user.id, email: user.email, firebaseUid: user.firebaseUid, roles: user.roles });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=make-admin.js.map