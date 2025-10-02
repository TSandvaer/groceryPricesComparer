import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  query,
  where,
  orderBy,
  deleteDoc,
  setDoc,
  getDoc,
  deleteField,
} from 'firebase/firestore';
import { db } from './config';
import type { UserRequest, User } from '../types';

const USER_REQUESTS_COLLECTION = 'userRequests';
const USERS_COLLECTION = 'users';

// Simple hash function for password (in production, use bcrypt or similar)
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const createUserRequest = async (email: string, password: string) => {
  try {
    // Check if request already exists
    const q = query(
      collection(db, USER_REQUESTS_COLLECTION),
      where('email', '==', email)
    );
    const existingRequests = await getDocs(q);

    if (!existingRequests.empty) {
      // Check status of existing request
      const existingRequest = existingRequests.docs[0].data();
      if (existingRequest.status === 'pending') {
        throw new Error('A request for this email is already pending approval');
      } else if (existingRequest.status === 'rejected') {
        throw new Error('Your previous request was rejected. Please contact the administrator.');
      }
    }

    const hashedPassword = await hashPassword(password);

    const requestData = {
      email,
      password: hashedPassword,
      status: 'pending' as const,
      requestedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, USER_REQUESTS_COLLECTION), requestData);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const getUserRequests = async (statusFilter?: 'pending' | 'approved' | 'rejected') => {
  try {
    let q;
    if (statusFilter) {
      q = query(
        collection(db, USER_REQUESTS_COLLECTION),
        where('status', '==', statusFilter),
        orderBy('requestedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, USER_REQUESTS_COLLECTION),
        orderBy('requestedAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const requests: UserRequest[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        email: data.email,
        password: data.password,
        status: data.status,
        requestedAt: data.requestedAt.toDate(),
        reviewedAt: data.reviewedAt?.toDate(),
        reviewedBy: data.reviewedBy,
      } as UserRequest);
    });

    return requests;
  } catch (error) {
    throw error;
  }
};

export const approveUserRequest = async (
  requestId: string,
  adminEmail: string
) => {
  try {
    // Get the request to find the email
    const requestRef = doc(db, USER_REQUESTS_COLLECTION, requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      throw new Error('User request not found');
    }

    const requestData = requestDoc.data();

    // Update request status to approved
    await updateDoc(requestRef, {
      status: 'approved',
      reviewedAt: Timestamp.now(),
      reviewedBy: adminEmail,
    });

    // Create a placeholder user document with a temporary ID based on email
    // This will be replaced with the real UID when they first sign in
    const tempUserId = `pending_${requestData.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const userRef = doc(db, USERS_COLLECTION, tempUserId);

    // Check if temp user already exists
    const existingUser = await getDoc(userRef);
    if (!existingUser.exists()) {
      await setDoc(userRef, {
        email: requestData.email,
        isDataContributor: false,
        isPending: true,
        createdAt: Timestamp.now(),
        lastLogin: Timestamp.now(),
      });
    }
  } catch (error) {
    throw error;
  }
};

export const rejectUserRequest = async (requestId: string, adminEmail: string) => {
  try {
    const requestRef = doc(db, USER_REQUESTS_COLLECTION, requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      reviewedAt: Timestamp.now(),
      reviewedBy: adminEmail,
      password: '', // Clear password hash
    });
  } catch (error) {
    throw error;
  }
};

export const deleteUserRequest = async (requestId: string) => {
  try {
    const requestRef = doc(db, USER_REQUESTS_COLLECTION, requestId);
    await deleteDoc(requestRef);
  } catch (error) {
    throw error;
  }
};

export const checkUserRequestStatus = async (email: string): Promise<UserRequest | null> => {
  try {
    const q = query(
      collection(db, USER_REQUESTS_COLLECTION),
      where('email', '==', email),
      orderBy('requestedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      email: data.email,
      password: data.password,
      status: data.status,
      requestedAt: data.requestedAt.toDate(),
      reviewedAt: data.reviewedAt?.toDate(),
      reviewedBy: data.reviewedBy,
    } as UserRequest;
  } catch (error) {
    throw error;
  }
};

// User Management Functions

export const createOrUpdateUser = async (userId: string, email: string, isDataContributor: boolean = false) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);

    // Check for temporary user document
    const tempUserId = `pending_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const tempUserRef = doc(db, USERS_COLLECTION, tempUserId);
    const tempUserDoc = await getDoc(tempUserRef);

    if (!userDoc.exists()) {
      // Create new user, migrating data from temp user if it exists
      const userData: any = {
        email,
        isDataContributor: tempUserDoc.exists() ? tempUserDoc.data().isDataContributor : isDataContributor,
        createdAt: tempUserDoc.exists() ? tempUserDoc.data().createdAt : Timestamp.now(),
        lastLogin: Timestamp.now(),
      };

      await setDoc(userRef, userData);

      // Delete temp user document if it exists (admin will do this via cloud function or we skip for now)
      // Since users can't delete docs they don't own, we'll leave cleanup to admin or let it be
      // The temp doc won't interfere since we check by UID
    } else {
      // Update last login and remove isPending flag if it exists
      const updateData: any = {
        lastLogin: Timestamp.now(),
      };

      if (userDoc.data().isPending) {
        updateData.isPending = deleteField();
      }

      await updateDoc(userRef, updateData);
    }
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error);
    throw error;
  }
};

export const getUserContributorStatus = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.isDataContributor || false;
    }

    return false;
  } catch (error) {
    console.error('Error getting contributor status:', error);
    return false;
  }
};

export const toggleDataContributor = async (userId: string, isContributor: boolean) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      isDataContributor: isContributor,
    });
  } catch (error) {
    throw error;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users: User[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Filter out temp users that have been replaced (check if real user exists)
      if (doc.id.startsWith('pending_')) {
        // This is a temp user, skip it if the real user exists
        return;
      }

      users.push({
        id: doc.id,
        email: data.email,
        isDataContributor: data.isDataContributor || false,
        isPending: data.isPending || false,
        createdAt: data.createdAt.toDate(),
        lastLogin: data.lastLogin.toDate(),
      } as User);
    });

    return users;
  } catch (error) {
    throw error;
  }
};
