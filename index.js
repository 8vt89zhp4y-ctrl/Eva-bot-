const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const mongoose = require('mongoose');
require('dotenv').config();

// ================================
// CLIENTE DE DISCORD
// ================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================================
// MODELO DE BRAINROTS
// ================================

const brainrotSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },

    imagen: {
        type: String,
        required: true
    },

    valor: {
        type: Number,
        required: true
    },

    demanda: {
        type: String,
        required: true,
        trim: true
    },

    precio: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

const Brainrot = mongoose.model('Brainrot', brainrotSchema);

// ================================
// COMANDO /ADD
// ================================

const addCommand = new SlashCommandBuilder()
    .setName('add')
    .setDescription('Añade un Brainrot')
    .addStringOption(option =>
        option
            .setName('nombre')
            .setDescription('Nombre del Brainrot')
            .setRequired(true)
    )
    .addAttachmentOption(option =>
        option
            .setName('imagen')
            .setDescription('Imagen del Brainrot')
            .setRequired(true)
    )
    .addNumberOption(option =>
        option
            .setName('valor')
            .setDescription('Valor del Brainrot')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('demanda')
            .setDescription('Demanda del Brainrot')
            .setRequired(true)
    )
    .addNumberOption(option =>
        option
            .setName('precio')
            .setDescription('Precio en Robux')
            .setRequired(true)
    );

// ================================
// CONEXIÓN A MONGODB
// ================================

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Conectado a MongoDB');
    })
    .catch(error => {
        console.error('❌ Error conectando a MongoDB:', error);
    });

// ================================
// BOT LISTO
// ================================

client.once('ready', async () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);

    try {
        await client.application.commands.set([
            addCommand.toJSON()
        ]);

        console.log('✅ Comando /add registrado correctamente');
    } catch (error) {
        console.error('❌ Error registrando /add:', error);
    }
});

// ================================
// INTERACCIONES
// ================================

client.on('interactionCreate', async interaction => {

    // ================================
    // /ADD
    // ================================

    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === 'add') {

            const nombre = interaction.options.getString('nombre');
            const imagen = interaction.options.getAttachment('imagen');
            const valor = interaction.options.getNumber('valor');
            const demanda = interaction.options.getString('demanda');
            const precio = interaction.options.getNumber('precio');

            try {

                const brainrot = await Brainrot.create({
                    nombre,
                    imagen: imagen.url,
                    valor,
                    demanda,
                    precio
                });

                const timestamp = Math.floor(
                    brainrot.createdAt.getTime() / 1000
                );

                const embed = new EmbedBuilder()
                    .setDescription(
                        `🕐 **Última actualización:** <t:${timestamp}:F>`
                    )
                    .setTitle(`🛠️ ${nombre}`)
                    .setImage(imagen.url)
                    .addFields(
                        {
                            name: '💎 Valor',
                            value: `${valor}`,
                            inline: true
                        },
                        {
                            name: '📊 Demanda',
                            value: demanda,
                            inline: true
                        },
                        {
                            name: '💲 Precio',
                            value: `${precio} Robux`,
                            inline: true
                        }
                    )
                    .setTimestamp();

                await interaction.channel.send({
                    embeds: [embed]
                });

                await interaction.reply({
                    content: '✅ Brainrot añadido correctamente.',
                    ephemeral: true
                });

            } catch (error) {

                console.error(
                    '❌ Error guardando el Brainrot:',
                    error
                );

                await interaction.reply({
                    content: '❌ Ocurrió un error al guardar el Brainrot.',
                    ephemeral: true
                });
            }
        }

        return;
    }

    // ================================
    // BOTONES
    // ================================

    if (interaction.isButton()) {

        if (!interaction.customId.startsWith('brainrot_')) {
            return;
        }

        const brainrotId = interaction.customId.replace(
            'brainrot_',
            ''
        );

        try {

            const brainrot = await Brainrot.findById(brainrotId);

            if (!brainrot) {
                return interaction.reply({
                    content: '❌ Ese Brainrot ya no existe.',
                    ephemeral: true
                });
            }

            const timestamp = Math.floor(
                brainrot.updatedAt.getTime() / 1000
            );

            const embed = new EmbedBuilder()
                .setDescription(
                    `🕐 **Última actualización:** <t:${timestamp}:F>`
                )
                .setTitle(`🛠️ ${brainrot.nombre}`)
                .setImage(brainrot.imagen)
                .addFields(
                    {
                        name: '💎 Valor',
                        value: `${brainrot.valor}`,
                        inline: true
                    },
                    {
                        name: '📊 Demanda',
                        value: brainrot.demanda,
                        inline: true
                    },
                    {
                        name: '💲 Precio',
                        value: `${brainrot.precio} Robux`,
                        inline: true
                    }
                )
                .setTimestamp();

            await interaction.reply({
                embeds: [embed]
            });

        } catch (error) {

            console.error(
                '❌ Error mostrando Brainrot:',
                error
            );

            await interaction.reply({
                content: '❌ Ocurrió un error al mostrar el Brainrot.',
                ephemeral: true
            });
        }
    }
});

// ================================
// COMANDO ?VALOR
// ================================

client.on('messageCreate', async message => {

    if (message.author.bot) return;

    if (!message.content.toLowerCase().startsWith('?valor')) {
        return;
    }

    const busqueda = message.content
        .slice(6)
        .trim();

    if (!busqueda) {
        return message.reply(
            '❌ Escribe el nombre o parte del nombre del Brainrot.\n\n' +
            'Ejemplo: `?valor skibidi`'
        );
    }

    try {

        const palabras = busqueda
            .split(/\s+/)
            .filter(Boolean);

        const regex = palabras
            .map(palabra =>
                palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            )
            .join('.*');

        const brainrots = await Brainrot.find({
            nombre: {
                $regex: regex,
                $options: 'i'
            }
        }).limit(25);

        if (brainrots.length === 0) {
            return message.reply(
                `❌ No encontré ningún Brainrot relacionado con **${busqueda}**.`
            );
        }

        // ================================
        // UN SOLO RESULTADO
        // ================================

        if (brainrots.length === 1) {

            const brainrot = brainrots[0];

            const timestamp = Math.floor(
                brainrot.updatedAt.getTime() / 1000
            );

            const embed = new EmbedBuilder()
                .setDescription(
                    `🕐 **Última actualización:** <t:${timestamp}:F>`
                )
                .setTitle(`🛠️ ${brainrot.nombre}`)
                .setImage(brainrot.imagen)
                .addFields(
                    {
                        name: '💎 Valor',
                        value: `${brainrot.valor}`,
                        inline: true
                    },
                    {
                        name: '📊 Demanda',
                        value: brainrot.demanda,
                        inline: true
                    },
                    {
                        name: '💲 Precio',
                        value: `${brainrot.precio} Robux`,
                        inline: true
                    }
                )
                .setTimestamp();

            return message.reply({
                embeds: [embed]
            });
        }

        // ================================
        // VARIOS RESULTADOS
        // ================================

        const botones = brainrots.map(brainrot =>
            new ButtonBuilder()
                .setCustomId(`brainrot_${brainrot._id}`)
                .setLabel(brainrot.nombre.substring(0, 80))
                .setStyle(ButtonStyle.Secondary)
        );

        const filas = [];

        for (let i = 0; i < botones.length; i += 5) {

            filas.push(
                new ActionRowBuilder().addComponents(
                    botones.slice(i, i + 5)
                )
            );
        }

        const embed = new EmbedBuilder()
            .setTitle('🔎 Resultados de búsqueda')
            .setDescription(
                `Encontré **${brainrots.length}** Brainrots relacionados con:\n` +
                `**${busqueda}**\n\n` +
                'Selecciona el que estás buscando.'
            )
            .setTimestamp();

        await message.reply({
            embeds: [embed],
            components: filas
        });

    } catch (error) {

        console.error(
            '❌ Error buscando Brainrot:',
            error
        );

        await message.reply(
            '❌ Ocurrió un error al buscar el Brainrot.'
        );
    }
});

// ================================
// LOGIN
// ================================

client.login(process.env.TOKEN);
