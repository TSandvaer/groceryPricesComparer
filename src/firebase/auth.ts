import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { auth } from './config';
import { createUserRequest, checkUserRequestStatus, createOrUpdateUser } from './userManagement';

export const signUp = async (email: string, password: string) => {
  try {
    // Create a user request instead of directly creating the user
    await createUserRequest(email, password);
    return { success: true, message: 'Your request has been submitted. You will receive access once approved by an administrator.' };
  } catch (error) {
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    console.log('signIn: Attempting to sign in user:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('signIn: User signed in successfully, UID:', userCredential.user.uid);
    // Create or update user document in Firestore (will migrate temp user if exists)
    await createOrUpdateUser(userCredential.user.uid, email);
    console.log('signIn: User document created/updated');
    return userCredential.user;
  } catch (error: any) {
    console.log('signIn: Error signing in:', error.code, error.message);
    // Check if user has a pending or rejected request
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      console.log('signIn: Checking user request status');
      const request = await checkUserRequestStatus(email);
      console.log('signIn: User request status:', request?.status);
      if (request) {
        if (request.status === 'pending') {
          throw new Error('Your access request is pending approval. Please wait for administrator approval.');
        } else if (request.status === 'rejected') {
          throw new Error('Your access request was rejected. Please contact the administrator.');
        } else if (request.status === 'approved') {
          // Request approved! Create the user account with their original password
          console.log('signIn: Request approved, creating user account');
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('signIn: User account created, UID:', userCredential.user.uid);
            // Create user document in Firestore (will migrate temp user if exists)
            await createOrUpdateUser(userCredential.user.uid, email);
            console.log('signIn: User document created/updated after account creation');
            return userCredential.user;
          } catch (createError: any) {
            console.log('signIn: Error creating user account:', createError.code, createError.message);
            if (createError.code === 'auth/weak-password') {
              throw new Error('Your password is too weak. Please use a stronger password.');
            }
            throw createError;
          }
        }
      }
    }
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};
