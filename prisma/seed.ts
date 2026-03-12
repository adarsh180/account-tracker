const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Seed admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@scraptrade.local' },
    update: {},
    create: {
      email: 'admin@scraptrade.local',
      password: hashedPassword,
      name: 'Admin',
    },
  })
  console.log('✅ Admin user created')

  // Seed app config
  const configs = [
    { key: 'emergency_locked', value: 'false' },
    { key: 'app_name', value: 'Scrap-Trade Executive' },
  ]
  for (const config of configs) {
    await prisma.appConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    })
  }
  console.log('✅ App config seeded')

  // Seed default commodity inventory entries
  const commodities = [
    { commodity: 'Copper', unit: 'KG' },
    { commodity: 'MS_Scrap', unit: 'KG' },
    { commodity: 'Battery', unit: 'PCS' },
    { commodity: 'Carbide', unit: 'KG' },
    { commodity: 'Aluminum', unit: 'KG' },
    { commodity: 'Armature', unit: 'PCS' },
    { commodity: 'Boring_Fresh', unit: 'KG' },
    { commodity: 'Boring_Mix', unit: 'KG' },
  ]
  for (const item of commodities) {
    await prisma.inventory.upsert({
      where: { commodity: item.commodity },
      update: {},
      create: {
        commodity: item.commodity,
        unit: item.unit,
        quantity: 0,
        avgCost: 0,
      },
    })
  }
  console.log('✅ Default commodities seeded')

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
