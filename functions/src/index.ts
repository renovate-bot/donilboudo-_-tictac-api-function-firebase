import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as bodyParser from "body-parser";
const uuidv4 = require('uuid/v4');

admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

const app = express();
const main = express();

main.use('/api/v1', app);
main.use(bodyParser.json());

export const webApi = functions.https.onRequest(main);

app.get('/warmup', (request, response) => {
    response.send('Warming up friend.');
});


app.get('/deliveries', async (request, response) => {
    try {
        const deliveryQuerySnapshot = await db.collection('deliveries').get();
        const deliveries: any = [];
        deliveryQuerySnapshot.forEach(
            (doc) => {
                deliveries.push({ id: doc.id, data: doc.data() });
            }
        );

        response.json(deliveries);

    } catch (error) {
        response.status(500).send(error);
    }
});

app.get('/deliveries/:deliveryId', async (request, response) => {
    try {
        const deliveryId = request.params.deliveryId;
        if (!deliveryId) throw new Error('Delivery ID is required');

        const delivery = await db.collection('deliveries').doc(deliveryId).get();
        if (!delivery.exists) {
            throw new Error('Delivery doesnt exist.')
        }

        const data = delivery.data();
        let customData = {};

        if (data) {
            let senderName = data.senderName;
            if (data.client) {
                senderName = data.client.name;
            }

            let senderPhone = data.senderPhone;
            if (data.client) {
                senderPhone = data.senderPhone;
            }

            let senderAddress = data.senderAddress;
            if (data.senderAddressDetails) {
                senderAddress += ', ' + data.senderAddressDetails;
            }

            let receiverAddress = data.receiverAddress;
            if (data.receiverAddressDetails) {
                receiverAddress += ', ' + data.receiverAddressDetails;
            }

            let deliverer = {};
            if (data.deliverer) {
                deliverer = {
                    lastName: data.deliverer.lastName,
                    firstName: data.deliverer.firstName
                }
            }

            customData = {
                deliveryNumber: data.deliveryNumber,
                requestDate: data.requestDate,
                startDate: data.startDate,
                completeDate: data.completeDate,
                cancelDate: data.cancelDate,
                // origin: data.completeDate,
                packageType: data.packageType,
                paymentType: data.paymentType,
                senderName: senderName,
                senderPhone: senderPhone,
                senderAddress: senderAddress,
                senderComments: data.senderComments,
                receiverName: data.receiverName,
                receiverPhone: data.receiverPhone,
                receiverAddress: receiverAddress,
                receiverComments: data.receiverComments,
                deliverer: deliverer,
                status: data.status
            }
        }

        response.json(customData);

    } catch (error) {
        console.log(error);
        response.status(500).send(error);
    }
});

app.post('/deliveries', async (request, response) => {
    try {
        const requestDate = formatDateTime(new Date());
        const data = request.body;
        data.requestDate = requestDate;
        data.deliveryNumber = createID();
        data.status = 'WAITING_FOR_APPROVE';

        console.log(data);

        await db.collection('deliveries').doc(data.deliveryNumber).set(Object.assign({}, data));
        // const delivery = await deliveryRef.get();

        response.json({
            deliveryNumber: data.deliveryNumber
        });

    } catch (error) {
        response.status(500).send(error);
    }
});

function formatDateTime(date: Date): string {
    let month = (date.getMonth() + 1).toString();
    if (month.length === 1) {
        month = '0' + month;
    }
    let day = date.getDate().toString();
    if (day.length === 1) {
        day = '0' + day;
    }
    let hours = date.getHours().toString();
    if (date.getHours().toString().length === 1) {
        hours = '0' + date.getHours().toString();
    }
    let minutes = date.getMinutes().toString();
    if (date.getMinutes().toString().length === 1) {
        minutes = '0' + date.getMinutes().toString();
    }

    return day + '-' + month + '-' + date.getFullYear() + ' ' + hours + ':' + minutes;
}

function createID(): string {
    const uuid = uuidv4();
    const uuidArray = uuid.split('-');
    const now = new Date();

    let month = (now.getMonth() + 1).toString();
    if (month.length === 1) {
        month = '0' + month;
    }
    let day = now.getDate().toString();
    if (day.length === 1) {
        day = '0' + day;
    }
    let hours = now.getHours().toString();
    if (now.getHours().toString().length === 1) {
        hours = '0' + now.getHours().toString();
    }
    let minutes = now.getMinutes().toString();
    if (now.getMinutes().toString().length === 1) {
        minutes = '0' + now.getMinutes().toString();
    }

    let id = 'D' + now.getFullYear() + '' + month + '' + day + '' + hours + '' + minutes;

    uuidArray.forEach((item: any) => {
        id += item.substring(0, 1);
    });
    id = id.substring(0, id.length - 3);

    return id.toUpperCase();
}